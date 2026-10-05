import 'dotenv/config';
import dns from 'dns';
// Ensure IPv4 resolution first so Node doesn't hang on unroutable IPv6 connections
dns.setDefaultResultOrder('ipv4first');

import http from 'http';
import type { AddressInfo } from 'net';
import sql from '../src/db/index';
import { signAuthToken } from '../src/utils/jwt';
import { fetchWhatsAppTemplates, WHATSAPP_TEMPLATES, maskPhoneNumber } from '../src/utils/whatsapp';
import { spawnBackend, stopProcess, waitFor, ManagedProcess } from './lib/whatsappTestHarness';

const TEST_PHONE = '8793964438';
const RUN_TIMESTAMP = Date.now();
const bizEmail = `e2e-biz-${RUN_TIMESTAMP}@example.com`;
const contractorEmail = `e2e-contractor-${RUN_TIMESTAMP}@example.com`;

interface StepResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
  category?: string;
}

const results: StepResult[] = [];

function recordStep(step: number, name: string, passed: boolean, details: string, category?: string) {
  results.push({ step, name, passed, details, category });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Step ${step}] ${statusStr}: ${name}`);
  if (details) {
    console.log(`         Details: ${details}`);
  }
  if (!passed && category) {
    console.log(`         Failure Category: ${category}`);
  }
}

async function freePort(): Promise<number> {
  const s = http.createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', () => r()));
  const port = (s.address() as AddressInfo).port;
  await new Promise((r) => s.close(r));
  return port;
}

async function runE2ETest() {
  console.log('===============================================================');
  console.log('  Craly WhatsApp application_selected E2E Real Test Runner');
  console.log('===============================================================\n');

  const cleanupIds = {
    users: [] as string[],
    businessProfiles: [] as string[],
    contractorProfiles: [] as string[],
    requirements: [] as string[],
    applications: [] as string[],
  };

  let apiProcess: ManagedProcess | null = null;
  let workerProcess: ManagedProcess | null = null;

  try {
    // ------------------------------------------------------------------------
    // Step 1: Verify WhatsApp credentials are loaded
    // ------------------------------------------------------------------------
    const version = process.env.WHATSAPP_API_VERSION?.trim();
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();

    const missing = [
      !version && 'WHATSAPP_API_VERSION',
      !phoneId && 'WHATSAPP_PHONE_NUMBER_ID',
      !token && 'WHATSAPP_ACCESS_TOKEN',
      !wabaId && 'WHATSAPP_BUSINESS_ACCOUNT_ID',
    ].filter(Boolean);

    if (missing.length > 0) {
      recordStep(
        1,
        'Verify WhatsApp credentials are loaded',
        false,
        `Missing environment variables: ${missing.join(', ')}`,
        'Meta credentials'
      );
    } else {
      recordStep(
        1,
        'Verify WhatsApp credentials are loaded',
        true,
        `Credentials loaded: API Version=${version}, Phone Number ID=${phoneId}, Business Account ID=${wabaId}, Access Token=set (${token!.length} chars)`
      );
    }

    // ------------------------------------------------------------------------
    // Step 2: Verify application_selected is APPROVED
    // ------------------------------------------------------------------------
    let templates: any[] = [];
    let appSelectedTemplate: any = null;
    try {
      templates = await fetchWhatsAppTemplates();
      appSelectedTemplate = templates.find(
        (t) => t.name === 'application_selected' && t.language === 'en_US'
      );

      if (!appSelectedTemplate) {
        recordStep(
          2,
          'Verify application_selected is APPROVED',
          false,
          `Template "application_selected" (en_US) was not found on WABA account ${wabaId}`,
          'template issue'
        );
      } else if (appSelectedTemplate.status !== 'APPROVED') {
        recordStep(
          2,
          'Verify application_selected is APPROVED',
          false,
          `Template "application_selected" status is "${appSelectedTemplate.status}" (expected APPROVED)`,
          'template issue'
        );
      } else {
        recordStep(
          2,
          'Verify application_selected is APPROVED',
          true,
          `Template "application_selected" (en_US) status is APPROVED (${appSelectedTemplate.category})`
        );
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      let cat = 'Meta API response';
      if (msg.includes('invalid or expired') || msg.includes('190')) {
        cat = 'Meta credentials';
      } else if (msg.includes('config')) {
        cat = 'Meta credentials';
      }
      recordStep(
        2,
        'Verify application_selected is APPROVED',
        false,
        `Failed to fetch templates from Meta Graph API: ${msg}`,
        cat
      );
    }

    // ------------------------------------------------------------------------
    // Step 3: Create exactly one minimal test opportunity
    // ------------------------------------------------------------------------
    let bizUser: any = null;
    let bizProfile: any = null;
    let requirement: any = null;
    let bizToken = '';

    try {
      [bizUser] = await sql`
        INSERT INTO users (email, password_hash, role, is_active)
        VALUES (${bizEmail}, 'hash_x', 'business', true)
        RETURNING id
      `;
      cleanupIds.users.push(bizUser.id);

      [bizProfile] = await sql`
        INSERT INTO business_profiles (user_id, company_name, phone, city, state, onboarding_complete)
        VALUES (${bizUser.id}, 'E2E Test Business Ltd', ${TEST_PHONE}, 'Pune', 'Maharashtra', true)
        RETURNING id
      `;
      cleanupIds.businessProfiles.push(bizProfile.id);

      [requirement] = await sql`
        INSERT INTO manpower_requirements (
          manufacturer_id, title, location, city, state, workers_required, required_skills, status, start_date, duration
        ) VALUES (
          ${bizProfile.id}, 'E2E Welders for Pune Plant', 'Chakan, Pune', 'Pune', 'Maharashtra', 5, '{}', 'PUBLISHED', '2026-11-01', '1 Month'
        ) RETURNING id, title
      `;
      cleanupIds.requirements.push(requirement.id);

      bizToken = signAuthToken({ sub: bizUser.id, role: 'business' });

      recordStep(
        3,
        'Create minimal test opportunity',
        true,
        `Created requirement ID: ${requirement.id} ("${requirement.title}") for business ID: ${bizProfile.id}`
      );
    } catch (err: any) {
      recordStep(
        3,
        'Create minimal test opportunity',
        false,
        `Failed to create test opportunity: ${err.message}`,
        'pg-boss/Neon connection'
      );
    }

    // ------------------------------------------------------------------------
    // Step 4: Create application for contractor with test recipient number
    // ------------------------------------------------------------------------
    let contractorUser: any = null;
    let contractorProfile: any = null;
    let application: any = null;

    try {
      [contractorUser] = await sql`
        INSERT INTO users (email, password_hash, role, is_active)
        VALUES (${contractorEmail}, 'hash_x', 'contractor', true)
        RETURNING id
      `;
      cleanupIds.users.push(contractorUser.id);

      [contractorProfile] = await sql`
        INSERT INTO contractor_profiles (
          user_id, company_name, phone, city, state, workforce_size, verification_status, onboarding_complete
        ) VALUES (
          ${contractorUser.id}, 'E2E Test Contractor', ${TEST_PHONE}, 'Pune', 'Maharashtra', 20, 'verified', true
        ) RETURNING id
      `;
      cleanupIds.contractorProfiles.push(contractorProfile.id);

      [application] = await sql`
        INSERT INTO applications (
          requirement_id, contractor_id, status, proposed_workforce, availability_date
        ) VALUES (
          ${requirement.id}, ${contractorProfile.id}, 'APPLIED', 5, '2026-11-01'
        ) RETURNING id, status
      `;
      cleanupIds.applications.push(application.id);

      recordStep(
        4,
        'Create application for contractor with test recipient number',
        true,
        `Created application ID: ${application.id} for contractor phone ${TEST_PHONE}`
      );
    } catch (err: any) {
      recordStep(
        4,
        'Create application for contractor with test recipient number',
        false,
        `Failed to create contractor application: ${err.message}`,
        'pg-boss/Neon connection'
      );
    }

    // ------------------------------------------------------------------------
    // Step 5: Trigger real application SELECTED flow through Craly API
    // ------------------------------------------------------------------------
    const port = await freePort();
    const envVars = {
      ...process.env,
      PORT: String(port),
      NODE_OPTIONS: '--dns-result-order=ipv4first',
    };

    try {
      apiProcess = spawnBackend('craly-api', 'src/server.ts', envVars as any);
      await apiProcess.waitForLine(/Craly API running/);

      const res = await fetch(`http://127.0.0.1:${port}/api/business/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizToken}`,
        },
        body: JSON.stringify({ status: 'SELECTED' }),
      });

      const resJson: any = await res.json().catch(() => ({}));

      if (res.status === 200) {
        recordStep(
          5,
          'Trigger real application SELECTED flow through Craly API',
          true,
          `API PATCH status 200: "${resJson?.message || 'Updated'}"`
        );
      } else {
        recordStep(
          5,
          'Trigger real application SELECTED flow through Craly API',
          false,
          `API returned HTTP ${res.status}: ${JSON.stringify(resJson)}`,
          'API/application flow'
        );
      }
    } catch (err: any) {
      recordStep(
        5,
        'Trigger real application SELECTED flow through Craly API',
        false,
        `API call failed: ${err.message}`,
        'API/application flow'
      );
    }

    // ------------------------------------------------------------------------
    // Step 6: Verify API creates the pg-boss WhatsApp job
    // ------------------------------------------------------------------------
    let queuedJob: any = null;
    let jobCount = 0;
    try {
      const queueName = process.env.WHATSAPP_QUEUE_NAME?.trim() || 'whatsapp';
      const jobs = await sql`
        SELECT id, state, data, created_on
        FROM pgboss.job
        WHERE name = ${queueName}
          AND data->>'template' = 'application_selected'
          AND data->'context'->>'entityId' = ${application.id}
      `;

      jobCount = jobs.length;
      if (jobCount === 1) {
        queuedJob = jobs[0];
        recordStep(
          6,
          'Verify API creates pg-boss WhatsApp job',
          true,
          `pg-boss job created: ID=${queuedJob.id}, state=${queuedJob.state}, template=${queuedJob.data?.template}, recipient=${queuedJob.data?.to}`
        );
      } else if (jobCount === 0) {
        recordStep(
          6,
          'Verify API creates pg-boss WhatsApp job',
          false,
          `No pg-boss job found for application_selected (application ${application.id}) in pgboss.job`,
          'API/application flow'
        );
      } else {
        recordStep(
          6,
          'Verify API creates pg-boss WhatsApp job',
          false,
          `Expected exactly 1 pg-boss job, found ${jobCount}`,
          'API/application flow'
        );
      }
    } catch (err: any) {
      recordStep(
        6,
        'Verify API creates pg-boss WhatsApp job',
        false,
        `Failed to query pgboss.job table: ${err.message}`,
        'pg-boss/Neon connection'
      );
    }

    // ------------------------------------------------------------------------
    // Step 7: Verify craly-worker picks up job
    // ------------------------------------------------------------------------
    try {
      workerProcess = spawnBackend('craly-worker', 'src/worker.ts', envVars as any);
      await workerProcess.waitForLine(/\[worker\] started/);

      // Wait up to 15 seconds for job state to change from created to completed / failed
      const queueName = process.env.WHATSAPP_QUEUE_NAME?.trim() || 'whatsapp';
      let finalJobState: any = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (!queuedJob) break;
        const [updatedJob] = await sql`
          SELECT id, state, output, retry_count
          FROM pgboss.job
          WHERE id = ${queuedJob.id}
        `;
        if (updatedJob && updatedJob.state !== 'created' && updatedJob.state !== 'active') {
          finalJobState = updatedJob;
          break;
        }
      }

      if (finalJobState) {
        recordStep(
          7,
          'Verify craly-worker picks up the job',
          true,
          `Worker processed job ${queuedJob.id}: final state=${finalJobState.state}`
        );
      } else {
        recordStep(
          7,
          'Verify craly-worker picks up the job',
          false,
          `Worker did not finish processing job ${queuedJob?.id} within timeout`,
          'worker'
        );
      }

      // ------------------------------------------------------------------------
      // Step 8 & 9: Verify worker calls REAL Meta Graph API & returns message ID
      // ------------------------------------------------------------------------
      if (finalJobState) {
        const output = finalJobState.output || {};
        const messageId = output.messageId;

        if (finalJobState.state === 'completed' && messageId) {
          recordStep(
            8,
            'Verify worker calls REAL Meta Graph API',
            true,
            `Meta Graph API HTTP call succeeded for recipient ${output.to || TEST_PHONE}`
          );
          recordStep(
            9,
            'Verify Meta returns a message ID',
            true,
            `Meta returned message ID: ${messageId}`
          );
          recordStep(
            10,
            'Confirm WhatsApp message delivered to test number',
            true,
            `Meta accepted template application_selected for recipient +91 ${TEST_PHONE} (Message ID: ${messageId})`
          );
          recordStep(
            11,
            'Verify pg-boss job completes successfully',
            true,
            `Job ${queuedJob.id} state in pgboss.job is completed`
          );
        } else {
          const errMsg = output.error || JSON.stringify(output);
          let cat = 'Meta API response';
          if (errMsg.includes('expired') || errMsg.includes('190') || output.meta_code === 190) {
            cat = 'Meta credentials';
          } else if (errMsg.includes('131030') || output.meta_code === 131030) {
            cat = 'Meta recipient restriction';
          } else if (errMsg.includes('132000') || errMsg.includes('132001') || output.meta_code === 132001) {
            cat = 'template issue';
          }

          recordStep(
            8,
            'Verify worker calls REAL Meta Graph API',
            false,
            `Worker call to Meta failed: ${errMsg} (Meta Code: ${output.meta_code || 'none'}, HTTP ${output.http_status || 'none'})`,
            cat
          );
          recordStep(
            9,
            'Verify Meta returns a message ID',
            false,
            `No message ID returned because Meta call failed`,
            cat
          );
          recordStep(
            10,
            'Confirm WhatsApp message delivered to test number',
            false,
            `Message not sent due to Meta API failure: ${errMsg}`,
            cat
          );
          recordStep(
            11,
            'Verify pg-boss job completes successfully',
            false,
            `Job state is "${finalJobState.state}" instead of "completed"`,
            cat
          );
        }
      } else {
        recordStep(8, 'Verify worker calls REAL Meta Graph API', false, 'Job was not picked up by worker', 'worker');
        recordStep(9, 'Verify Meta returns a message ID', false, 'Job was not processed', 'worker');
        recordStep(10, 'Confirm WhatsApp message delivered to test number', false, 'Job was not processed', 'worker');
        recordStep(11, 'Verify pg-boss job completes successfully', false, 'Job state remained created/active', 'worker');
      }
    } catch (err: any) {
      recordStep(
        7,
        'Verify craly-worker picks up the job',
        false,
        `Worker execution error: ${err.message}`,
        'worker'
      );
    }

    // ------------------------------------------------------------------------
    // Step 12: Confirm only one WhatsApp job/message was generated
    // ------------------------------------------------------------------------
    try {
      const queueName = process.env.WHATSAPP_QUEUE_NAME?.trim() || 'whatsapp';
      const allJobs = await sql`
        SELECT id FROM pgboss.job
        WHERE name = ${queueName}
          AND data->>'template' = 'application_selected'
          AND data->'context'->>'entityId' = ${application?.id || ''}
      `;

      const allEvents = await sql`
        SELECT id FROM platform_events
        WHERE event_type IN ('whatsapp_sent', 'whatsapp_failed')
          AND entity_type = 'application'
          AND entity_id = ${application?.id || ''}
      `;

      if (allJobs.length === 1 && allEvents.length <= 1) {
        recordStep(
          12,
          'Confirm only one WhatsApp job/message was generated',
          true,
          `Exactly 1 pg-boss job (${allJobs.length}) and ${allEvents.length} event record(s) generated for this application event`
        );
      } else {
        recordStep(
          12,
          'Confirm only one WhatsApp job/message was generated',
          false,
          `Generated ${allJobs.length} pg-boss job(s) and ${allEvents.length} event(s) (expected 1 job, max 1 event)`,
          'API/application flow'
        );
      }
    } catch (err: any) {
      recordStep(
        12,
        'Confirm only one WhatsApp job/message was generated',
        false,
        `Failed to check job/event counts: ${err.message}`,
        'pg-boss/Neon connection'
      );
    }

  } finally {
    // Cleanup processes
    if (workerProcess) {
      await stopProcess(workerProcess, 'SIGTERM').catch(() => {});
    }
    if (apiProcess) {
      await stopProcess(apiProcess, 'SIGTERM').catch(() => {});
    }

    // Cleanup DB fixtures
    console.log('\nCleaning up test fixtures from Neon Postgres database...');
    try {
      if (cleanupIds.applications.length) {
        await sql`DELETE FROM applications WHERE id = ANY(${cleanupIds.applications})`;
      }
      if (cleanupIds.requirements.length) {
        await sql`DELETE FROM manpower_requirements WHERE id = ANY(${cleanupIds.requirements})`;
      }
      if (cleanupIds.contractorProfiles.length) {
        await sql`DELETE FROM contractor_profiles WHERE id = ANY(${cleanupIds.contractorProfiles})`;
      }
      if (cleanupIds.businessProfiles.length) {
        await sql`DELETE FROM business_profiles WHERE id = ANY(${cleanupIds.businessProfiles})`;
      }
      if (cleanupIds.users.length) {
        await sql`DELETE FROM users WHERE id = ANY(${cleanupIds.users})`;
      }
      console.log('Cleanup completed successfully.');
    } catch (err: any) {
      console.error('Cleanup error:', err.message);
    }
  }

  // Print summary table
  console.log('\n===============================================================');
  console.log('                   E2E TEST SUMMARY');
  console.log('===============================================================');
  for (const r of results) {
    const symbol = r.passed ? '✅' : '❌';
    console.log(`${symbol} Step ${r.step}: ${r.name}`);
    console.log(`   Details: ${r.details}`);
    if (!r.passed && r.category) {
      console.log(`   Category: ${r.category}`);
    }
  }
  console.log('===============================================================\n');

  const failedSteps = results.filter((r) => !r.passed);
  if (failedSteps.length > 0) {
    console.log(`E2E Test Failed on ${failedSteps.length} step(s).`);
    process.exit(1);
  } else {
    console.log('E2E Test Completed Successfully! All 12 steps passed.');
    process.exit(0);
  }
}

runE2ETest().catch((err) => {
  console.error('Fatal error during E2E test:', err);
  process.exit(1);
});
