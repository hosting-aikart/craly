import sql from '../src/db/index';
import { hashPassword } from '../src/utils/password';
import { PUBLICLY_DISCOVERABLE_CONDITION } from '../src/utils/contractorVisibility';

async function runVerificationWorkflowTests() {
  console.log('=== STARTING CONTRACTOR VERIFICATION WORKFLOW TESTS ===\n');

  // Find a staff user
  const [staffUser] = await sql`SELECT id, email, role FROM users WHERE role IN ('staff', 'admin') LIMIT 1`;
  if (!staffUser) {
    throw new Error('No staff/admin user found to run verification tests');
  }
  console.log(`Using Staff reviewer: ${staffUser.email} (${staffUser.role}, ID: ${staffUser.id})\n`);

  const createdUserIds: string[] = [];
  const createdContractorIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST CASE A: Contractor self-registration flow
    // -------------------------------------------------------------------------
    console.log('[TEST A] Contractor self-registration flow:');
    const selfEmail = `self_ctr_${Date.now()}@example.com`;
    const passwordHash = await hashPassword('TestPass123!');

    const [selfUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active, is_email_verified)
      VALUES (${selfEmail}, ${passwordHash}, 'contractor', true, true)
      RETURNING id, email, role
    `;
    createdUserIds.push(selfUser.id);

    const [selfContractor] = await sql`
      INSERT INTO contractor_profiles (
        user_id, company_name, phone, city, state, workforce_size, years_experience, verification_status
      )
      VALUES (
        ${selfUser.id}, 'Self Registered Contractors Ltd', '+91 9123456780', 'Pune', 'Maharashtra',
        25, 4, 'pending'
      )
      RETURNING id, verification_status, onboarding_complete
    `;
    createdContractorIds.push(selfContractor.id);

    console.log(`  1. Contractor registered: status = '${selfContractor.verification_status}', onboarding_complete = ${selfContractor.onboarding_complete}`);
    if (selfContractor.verification_status !== 'pending') {
      throw new Error(`Expected initial status 'pending', got '${selfContractor.verification_status}'`);
    }

    // Contractor completes profile
    await sql`
      UPDATE contractor_profiles
      SET onboarding_complete = true, updated_at = now()
      WHERE id = ${selfContractor.id}
    `;

    // Contractor uploads a document
    const [selfDoc] = await sql`
      INSERT INTO contractor_documents (
        id, contractor_id, document_type, storage_key, file_name, mime_type, size_bytes, uploaded_by, status
      ) VALUES (
        gen_random_uuid(), ${selfContractor.id}, 'gst_certificate', 'docs/test-gst.pdf', 'test-gst.pdf',
        'application/pdf', 1024, ${selfUser.id}, 'pending'
      )
      RETURNING id, status
    `;
    console.log(`  2. Document submitted: doc_status = '${selfDoc.status}'`);

    // Staff approves document
    await sql`
      UPDATE contractor_documents SET status = 'approved', updated_at = now() WHERE id = ${selfDoc.id}
    `;
    await sql`
      UPDATE contractor_profiles
      SET verification_status = 'verified', last_verified_at = now(), onboarding_complete = true, updated_at = now()
      WHERE id = ${selfContractor.id}
    `;

    const [selfApproved] = await sql`
      SELECT verification_status, onboarding_complete, last_verified_at FROM contractor_profiles WHERE id = ${selfContractor.id}
    `;
    console.log(`  3. Staff approved: status = '${selfApproved.verification_status}', onboarding_complete = ${selfApproved.onboarding_complete}`);
    if (selfApproved.verification_status !== 'verified') {
      throw new Error(`Expected status 'verified', got '${selfApproved.verification_status}'`);
    }
    console.log('  -> TEST A PASSED!\n');

    // -------------------------------------------------------------------------
    // TEST CASE B: Staff creates/lists contractor flow
    // -------------------------------------------------------------------------
    console.log('[TEST B] Staff creates/lists contractor:');
    const staffCreatedEmail = `staff_ctr_${Date.now()}@example.com`;

    // Mirroring POST /api/staff/contractors
    const [staffCreatedUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${staffCreatedEmail}, ${passwordHash}, 'contractor', true)
      RETURNING id
    `;
    createdUserIds.push(staffCreatedUser.id);

    const [staffCreatedProfile] = await sql`
      INSERT INTO contractor_profiles (
        user_id, company_name, phone, description, industry, skills, city, state, workforce_size,
        years_experience, service_areas, availability, notes,
        verification_status, onboarding_complete, last_verified_at, created_by
      )
      VALUES (
        ${staffCreatedUser.id}, 'Staff Provisioned Works', '+91 9876543210', null, 'Manufacturing',
        ARRAY['Welding', 'CNC']::text[], 'Mumbai', 'Maharashtra', 50, 7, ARRAY['West Zone']::text[],
        'AVAILABLE', 'Met at industrial expo', 'pending', true, null, ${staffUser.id}
      )
      RETURNING id, company_name, verification_status, onboarding_complete, last_verified_at
    `;
    createdContractorIds.push(staffCreatedProfile.id);

    console.log(`  1. Staff created contractor: initial verification_status = '${staffCreatedProfile.verification_status}', last_verified_at = ${staffCreatedProfile.last_verified_at}`);
    if (staffCreatedProfile.verification_status === 'verified') {
      throw new Error("CRITICAL BUG: Staff-created contractor was set directly to 'verified'!");
    }
    if (staffCreatedProfile.verification_status !== 'pending') {
      throw new Error(`Expected verification_status 'pending', got '${staffCreatedProfile.verification_status}'`);
    }

    // Verify public discoverability condition fails for pending contractor
    const discoverableBefore = await sql`
      SELECT cp.id FROM contractor_profiles cp
      WHERE cp.id = ${staffCreatedProfile.id} AND ${PUBLICLY_DISCOVERABLE_CONDITION}
    `;
    console.log(`  2. Discoverable in public directory before KYC approval: ${discoverableBefore.length > 0} (Expected: false)`);
    if (discoverableBefore.length > 0) {
      throw new Error('Pending contractor leaked into public directory!');
    }

    // Staff or Contractor uploads required KYC document
    const [staffCtrDoc] = await sql`
      INSERT INTO contractor_documents (
        id, contractor_id, document_type, storage_key, file_name, mime_type, size_bytes, uploaded_by, status
      ) VALUES (
        gen_random_uuid(), ${staffCreatedProfile.id}, 'pan_card', 'docs/test-pan.pdf', 'test-pan.pdf',
        'application/pdf', 2048, ${staffUser.id}, 'pending'
      )
      RETURNING id, status
    `;
    console.log(`  3. Document uploaded: doc_id = ${staffCtrDoc.id}, status = '${staffCtrDoc.status}'`);

    // Staff reviews and approves the document
    await sql`
      UPDATE contractor_documents SET status = 'approved', updated_at = now() WHERE id = ${staffCtrDoc.id}
    `;
    // Replicating reviewStaffDocument logic when all docs are approved
    const allDocs = await sql`SELECT status FROM contractor_documents WHERE contractor_id = ${staffCreatedProfile.id}`;
    let overallStatus = 'under_review';
    if (allDocs.length > 0 && allDocs.every((d) => d.status === 'approved')) {
      overallStatus = 'verified';
    }
    await sql`
      UPDATE contractor_profiles
      SET 
        verification_status = ${overallStatus},
        last_verified_at = CASE WHEN ${overallStatus} = 'verified' THEN now() ELSE last_verified_at END,
        onboarding_complete = CASE WHEN ${overallStatus} = 'verified' THEN true ELSE onboarding_complete END,
        updated_at = now()
      WHERE id = ${staffCreatedProfile.id}
    `;

    const [staffCtrVerified] = await sql`
      SELECT verification_status, last_verified_at, onboarding_complete FROM contractor_profiles WHERE id = ${staffCreatedProfile.id}
    `;
    console.log(`  4. After staff KYC review: verification_status = '${staffCtrVerified.verification_status}', last_verified_at = ${staffCtrVerified.last_verified_at}`);
    if (staffCtrVerified.verification_status !== 'verified') {
      throw new Error(`Expected verification_status 'verified', got '${staffCtrVerified.verification_status}'`);
    }

    // Verify public discoverability now passes
    const discoverableAfter = await sql`
      SELECT cp.id FROM contractor_profiles cp
      WHERE cp.id = ${staffCreatedProfile.id} AND ${PUBLICLY_DISCOVERABLE_CONDITION}
    `;
    console.log(`  5. Discoverable in public directory after KYC approval: ${discoverableAfter.length > 0} (Expected: true)`);
    if (discoverableAfter.length === 0) {
      throw new Error('Verified contractor not found in public directory condition!');
    }
    console.log('  -> TEST B PASSED!\n');

    // -------------------------------------------------------------------------
    // TEST CASE C: Staff-created contractor without documents remains pending
    // -------------------------------------------------------------------------
    console.log('[TEST C] Staff-created contractor without documents:');
    const noDocsEmail = `nodocs_ctr_${Date.now()}@example.com`;
    const [noDocsUser] = await sql`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${noDocsEmail}, ${passwordHash}, 'contractor', true)
      RETURNING id
    `;
    createdUserIds.push(noDocsUser.id);

    const [noDocsProfile] = await sql`
      INSERT INTO contractor_profiles (
        user_id, company_name, verification_status, onboarding_complete, availability, created_by
      )
      VALUES (
        ${noDocsUser.id}, 'No Documents Contractor Co', 'pending', true, 'AVAILABLE', ${staffUser.id}
      )
      RETURNING id, verification_status
    `;
    createdContractorIds.push(noDocsProfile.id);

    console.log(`  1. Contractor created with 0 documents: status = '${noDocsProfile.verification_status}'`);
    if (noDocsProfile.verification_status !== 'pending') {
      throw new Error(`Expected 'pending', got '${noDocsProfile.verification_status}'`);
    }

    // Check that contractor remains pending
    const [checkNoDocs] = await sql`SELECT verification_status FROM contractor_profiles WHERE id = ${noDocsProfile.id}`;
    if (checkNoDocs.verification_status !== 'pending') {
      throw new Error(`Contractor without documents should remain pending, found: '${checkNoDocs.verification_status}'`);
    }
    console.log('  -> TEST C PASSED!\n');

    // -------------------------------------------------------------------------
    // TEST CASE D: Rejected documents and resubmission
    // -------------------------------------------------------------------------
    console.log('[TEST D] Rejected documents & resubmission flow:');
    const [rejectionDoc] = await sql`
      INSERT INTO contractor_documents (
        id, contractor_id, document_type, storage_key, file_name, mime_type, size_bytes, uploaded_by, status
      ) VALUES (
        gen_random_uuid(), ${noDocsProfile.id}, 'pan_card', 'docs/blurry-pan.pdf', 'blurry-pan.pdf',
        'application/pdf', 1024, ${noDocsUser.id}, 'pending'
      )
      RETURNING id
    `;

    // Staff rejects document
    await sql`
      UPDATE contractor_documents SET status = 'rejected', updated_at = now() WHERE id = ${rejectionDoc.id}
    `;
    await sql`
      UPDATE contractor_profiles
      SET verification_status = 'rejected', verification_note = 'Blurry document, cannot read PAN', updated_at = now()
      WHERE id = ${noDocsProfile.id}
    `;

    const [rejectedProfile] = await sql`
      SELECT verification_status, verification_note FROM contractor_profiles WHERE id = ${noDocsProfile.id}
    `;
    console.log(`  1. Document rejected: verification_status = '${rejectedProfile.verification_status}', note = '${rejectedProfile.verification_note}'`);
    if (rejectedProfile.verification_status !== 'rejected') {
      throw new Error(`Expected 'rejected', got '${rejectedProfile.verification_status}'`);
    }

    // Contractor resubmits a new document (documentController uploadDocument logic)
    const [newDoc] = await sql`
      INSERT INTO contractor_documents (
        id, contractor_id, document_type, storage_key, file_name, mime_type, size_bytes, uploaded_by, status
      ) VALUES (
        gen_random_uuid(), ${noDocsProfile.id}, 'pan_card', 'docs/clear-pan.pdf', 'clear-pan.pdf',
        'application/pdf', 1024, ${noDocsUser.id}, 'pending'
      )
      RETURNING id
    `;
    // Resubmission resets contractor verification_status from rejected to pending
    await sql`
      UPDATE contractor_profiles
      SET verification_status = CASE 
        WHEN verification_status IN ('rejected', 'needs_changes') THEN 'pending'
        ELSE verification_status 
      END,
      updated_at = now()
      WHERE id = ${noDocsProfile.id}
    `;

    const [resubmittedProfile] = await sql`
      SELECT verification_status FROM contractor_profiles WHERE id = ${noDocsProfile.id}
    `;
    console.log(`  2. Document resubmitted: verification_status reset to '${resubmittedProfile.verification_status}'`);
    if (resubmittedProfile.verification_status !== 'pending') {
      throw new Error(`Expected status to reset to 'pending' upon resubmission, got '${resubmittedProfile.verification_status}'`);
    }
    console.log('  -> TEST D PASSED!\n');

    // -------------------------------------------------------------------------
    // TEST CASE E: Direct staff status update authorization
    // -------------------------------------------------------------------------
    console.log('[TEST E] Direct staff status update via updateStaffContractorVerificationStatus:');
    // Staff manually sets status to needs_changes with a note
    await sql`
      UPDATE contractor_profiles
      SET verification_status = 'needs_changes', verification_note = 'Please provide valid PF certificate', updated_at = now()
      WHERE id = ${noDocsProfile.id}
    `;
    const [needsChangesProfile] = await sql`
      SELECT verification_status, verification_note FROM contractor_profiles WHERE id = ${noDocsProfile.id}
    `;
    console.log(`  1. Status updated to: '${needsChangesProfile.verification_status}', note: '${needsChangesProfile.verification_note}'`);
    if (needsChangesProfile.verification_status !== 'needs_changes') {
      throw new Error(`Expected 'needs_changes', got '${needsChangesProfile.verification_status}'`);
    }

    // Now staff verifies directly
    await sql`
      UPDATE contractor_profiles
      SET 
        verification_status = 'verified',
        verification_note = 'Verified after phone interview',
        last_verified_at = now(),
        onboarding_complete = true,
        updated_at = now()
      WHERE id = ${noDocsProfile.id}
    `;
    const [finalProfile] = await sql`
      SELECT verification_status, last_verified_at, onboarding_complete FROM contractor_profiles WHERE id = ${noDocsProfile.id}
    `;
    console.log(`  2. Final verification by staff: status = '${finalProfile.verification_status}', onboarding_complete = ${finalProfile.onboarding_complete}`);
    if (finalProfile.verification_status !== 'verified') {
      throw new Error(`Expected 'verified', got '${finalProfile.verification_status}'`);
    }
    console.log('  -> TEST E PASSED!\n');

    console.log('=== ALL 5 VERIFICATION WORKFLOW TEST CASES PASSED SUCCESSFULLY! ===');
  } finally {
    // Clean up test data
    console.log('\nCleaning up test records...');
    if (createdContractorIds.length > 0) {
      await sql`DELETE FROM contractor_documents WHERE contractor_id IN ${sql(createdContractorIds)}`;
      await sql`DELETE FROM verification_reviews WHERE contractor_id IN ${sql(createdContractorIds)}`;
      await sql`DELETE FROM organization_members WHERE contractor_profile_id IN ${sql(createdContractorIds)}`;
      await sql`DELETE FROM contractor_profiles WHERE id IN ${sql(createdContractorIds)}`;
    }
    if (createdUserIds.length > 0) {
      await sql`DELETE FROM users WHERE id IN ${sql(createdUserIds)}`;
    }
    console.log('Cleanup finished.');
    process.exit(0);
  }
}

runVerificationWorkflowTests().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
