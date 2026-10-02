import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import sql from '../src/db/index';
import { hashPassword } from '../src/utils/password';
import { requirementEligibilityCondition, MatchContractorProfile } from '../src/utils/opportunityMatching';
import { calculateOpportunityMatch, ContractorFullProfile } from '../src/controllers/contractorPortalController';

async function createMatchedPair() {
  console.log('================================================================');
  console.log('🚀 PROVISIONING TEST MATCHED PAIR (MANUFACTURER & CONTRACTOR)');
  console.log('================================================================\n');

  const defaultPassword = 'Password123!';
  const passwordHash = await hashPassword(defaultPassword);

  // 1. Provision Manufacturer
  const mfrEmail = 'demo_mfr@craly.com';
  console.log(`1. Creating / Updating Manufacturer User: ${mfrEmail}...`);
  
  const [mfrUser] = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${mfrEmail}, ${passwordHash}, 'business')
    ON CONFLICT (email)
    DO UPDATE SET password_hash = ${passwordHash}, role = 'business', updated_at = now()
    RETURNING id, email, role
  `;

  // Check existing business profile
  let [mfrProfile] = await sql`
    SELECT id FROM business_profiles WHERE user_id = ${mfrUser.id}
  `;

  if (!mfrProfile) {
    [mfrProfile] = await sql`
      INSERT INTO business_profiles (
        user_id, company_name, industry, city, state, onboarding_complete
      )
      VALUES (
        ${mfrUser.id},
        'Apex Precision Engineering Pvt Ltd',
        'Automotive',
        'Pune',
        'Maharashtra',
        true
      )
      RETURNING id, company_name
    `;
  } else {
    [mfrProfile] = await sql`
      UPDATE business_profiles
      SET
        company_name = 'Apex Precision Engineering Pvt Ltd',
        industry = 'Automotive',
        city = 'Pune',
        state = 'Maharashtra',
        onboarding_complete = true,
        updated_at = now()
      WHERE id = ${mfrProfile.id}
      RETURNING id, company_name
    `;
  }
  console.log(`   ✅ Manufacturer Profile ID: ${mfrProfile.id} (${mfrProfile.company_name})`);

  // Create or update published requirement
  // First clear old demo requirements for this manufacturer to be idempotent
  await sql`
    DELETE FROM applications WHERE requirement_id IN (
      SELECT id FROM manpower_requirements WHERE manufacturer_id = ${mfrProfile.id}
    )
  `;
  await sql`
    DELETE FROM manpower_requirements WHERE manufacturer_id = ${mfrProfile.id}
  `;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);

  const [requirement] = await sql`
    INSERT INTO manpower_requirements (
      manufacturer_id,
      title,
      description,
      industry,
      location,
      city,
      state,
      workers_required,
      required_skills,
      start_date,
      duration,
      experience_required,
      budget_min,
      budget_max,
      status,
      published_at
    )
    VALUES (
      ${mfrProfile.id},
      'Experienced CNC Operators & MIG Welders for Auto Assembly',
      'High-precision automotive assembly requirement for tier-1 OEM manufacturing unit in Chakan.',
      'Automotive',
      'Chakan Industrial Phase II, Pune, Maharashtra',
      'Pune',
      'Maharashtra',
      25,
      ARRAY['CNC Operation', 'MIG Welding', 'Quality Inspection']::text[],
      ${startDate.toISOString().split('T')[0]},
      '6 Months',
      3,
      22000,
      28000,
      'PUBLISHED',
      now()
    )
    RETURNING *
  `;
  console.log(`   ✅ Requirement Created: ID=${requirement.id}, Title="${requirement.title}"`);
  console.log(`      Workers: ${requirement.workers_required}, Skills: [${requirement.required_skills.join(', ')}], City: ${requirement.city}, State: ${requirement.state}\n`);

  // 2. Provision Contractor
  const contractorEmail = 'demo_contractor@craly.com';
  console.log(`2. Creating / Updating Contractor User: ${contractorEmail}...`);

  const [ctrUser] = await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${contractorEmail}, ${passwordHash}, 'contractor')
    ON CONFLICT (email)
    DO UPDATE SET password_hash = ${passwordHash}, role = 'contractor', updated_at = now()
    RETURNING id, email, role
  `;

  let [ctrProfile] = await sql`
    SELECT id FROM contractor_profiles WHERE user_id = ${ctrUser.id}
  `;

  const contractorData = {
    company_name: 'Bharat Industrial Workforce Solutions',
    phone: '+919876543210',
    industry: 'Automotive',
    workforce_size: 40,
    years_experience: 5,
    city: 'Pune',
    state: 'Maharashtra',
    service_areas: ['Pune', 'Pimpri-Chinchwad', 'Aurangabad'],
    skills: ['CNC Operation', 'MIG Welding', 'Quality Inspection', 'Assembly Line Operations'],
    availability: 'AVAILABLE',
    onboarding_complete: true,
    verification_status: 'verified',
    overall_rating: 4.8,
    ghosting_count: 0,
    repeat_engagement_count: 3,
    certification_status: 'certified'
  };

  if (!ctrProfile) {
    [ctrProfile] = await sql`
      INSERT INTO contractor_profiles (
        user_id, company_name, phone, industry, workforce_size,
        years_experience, city, state, service_areas, skills, availability,
        onboarding_complete, verification_status, overall_rating, ghosting_count,
        repeat_engagement_count, certification_status
      )
      VALUES (
        ${ctrUser.id},
        ${contractorData.company_name},
        ${contractorData.phone},
        ${contractorData.industry},
        ${contractorData.workforce_size},
        ${contractorData.years_experience},
        ${contractorData.city},
        ${contractorData.state},
        ${contractorData.service_areas}::text[],
        ${contractorData.skills}::text[],
        ${contractorData.availability},
        ${contractorData.onboarding_complete},
        ${contractorData.verification_status},
        ${contractorData.overall_rating},
        ${contractorData.ghosting_count},
        ${contractorData.repeat_engagement_count},
        ${contractorData.certification_status}
      )
      RETURNING *
    `;
  } else {
    [ctrProfile] = await sql`
      UPDATE contractor_profiles
      SET
        company_name = ${contractorData.company_name},
        phone = ${contractorData.phone},
        industry = ${contractorData.industry},
        workforce_size = ${contractorData.workforce_size},
        years_experience = ${contractorData.years_experience},
        city = ${contractorData.city},
        state = ${contractorData.state},
        service_areas = ${contractorData.service_areas}::text[],
        skills = ${contractorData.skills}::text[],
        availability = ${contractorData.availability},
        onboarding_complete = ${contractorData.onboarding_complete},
        verification_status = ${contractorData.verification_status},
        overall_rating = ${contractorData.overall_rating},
        ghosting_count = ${contractorData.ghosting_count},
        repeat_engagement_count = ${contractorData.repeat_engagement_count},
        certification_status = ${contractorData.certification_status},
        updated_at = now()
      WHERE id = ${ctrProfile.id}
      RETURNING *
    `;
  }

  console.log(`   ✅ Contractor Profile ID: ${ctrProfile.id} (${ctrProfile.company_name})`);
  console.log(`      Workforce: ${ctrProfile.workforce_size}, Skills: [${ctrProfile.skills.join(', ')}], City: ${ctrProfile.city}, State: ${ctrProfile.state}`);
  console.log(`      Status: ${ctrProfile.verification_status}, Onboarding: ${ctrProfile.onboarding_complete}\n`);

  // 3. Test Automatic Matching Logic
  console.log('3. Running the Live Matching Algorithm...');

  const matchContractorProfile: MatchContractorProfile = {
    workforce_size: ctrProfile.workforce_size,
    industry: ctrProfile.industry,
    city: ctrProfile.city,
    state: ctrProfile.state,
    service_areas: ctrProfile.service_areas,
    availability: ctrProfile.availability,
    years_experience: ctrProfile.years_experience
  };

  const eligibility = requirementEligibilityCondition(matchContractorProfile);

  // Query using the actual database SQL matching clause
  const matchedOpportunities = await sql`
    SELECT mr.*
    FROM manpower_requirements mr
    WHERE mr.id = ${requirement.id}
      AND mr.status IN ('PUBLISHED', 'APPLICATIONS_OPEN')
      AND ${eligibility}
  `;

  const isEligible = matchedOpportunities.length > 0;
  console.log(`   🔍 Eligibility Filter Result: ${isEligible ? '✅ PASSED (HARD GATES CLEARED)' : '❌ FAILED'}`);

  if (!isEligible) {
    throw new Error('Contractor did not pass eligibility filter!');
  }

  // Calculate detailed multi-factor match score
  const scoringProfile: ContractorFullProfile = {
    id: ctrProfile.id,
    company_name: ctrProfile.company_name,
    workforce_size: ctrProfile.workforce_size,
    industry: ctrProfile.industry,
    years_experience: ctrProfile.years_experience,
    city: ctrProfile.city,
    state: ctrProfile.state,
    service_areas: ctrProfile.service_areas,
    skills: ctrProfile.skills,
    availability: ctrProfile.availability,
    onboarding_complete: ctrProfile.onboarding_complete,
    verification_status: ctrProfile.verification_status,
    overall_rating: ctrProfile.overall_rating,
    ghosting_count: ctrProfile.ghosting_count,
    repeat_engagement_count: ctrProfile.repeat_engagement_count,
    certification_status: ctrProfile.certification_status,
    created_at: ctrProfile.created_at
  };

  const matchDetails = calculateOpportunityMatch(requirement, scoringProfile);

  console.log('\n================================================================');
  console.log('🎯 MATCH RESULT & BREAKDOWN:');
  console.log('================================================================');
  console.log(`   Overall Match Score: ${matchDetails.match_score}%`);
  console.log(`   Match Tier:          ${matchDetails.match_level}`);
  console.log('   Match Explanations:');
  matchDetails.match_reasons.forEach((reason) => {
    console.log(`     • ${reason}`);
  });
  console.log('================================================================\n');

  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('----------------------------------------------------------------');
  console.log('Manufacturer:');
  console.log(`  Email:    ${mfrEmail}`);
  console.log(`  Password: ${defaultPassword}`);
  console.log(`  Company:  ${mfrProfile.company_name}`);
  console.log('Contractor:');
  console.log(`  Email:    ${contractorEmail}`);
  console.log(`  Password: ${defaultPassword}`);
  console.log(`  Company:  ${ctrProfile.company_name}`);
  console.log('----------------------------------------------------------------\n');

  process.exit(0);
}

createMatchedPair().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
