import sql from '../src/db/index';
import { hashPassword } from '../src/utils/passwords';

async function seedDemoApplications() {
  const manufacturerEmail = 'testing03@gmail.com';
  console.log(`Starting demo application seed for manufacturer: ${manufacturerEmail}...`);

  // 1. Find or create manufacturer user
  let [user] = await sql`SELECT id, email, role FROM users WHERE email = ${manufacturerEmail}`;
  if (!user) {
    console.log(`User ${manufacturerEmail} not found. Creating user account...`);
    const passwordHash = await hashPassword('Password123!');
    [user] = await sql`
      INSERT INTO users (email, password_hash, role, is_active, is_email_verified, is_phone_verified)
      VALUES (${manufacturerEmail}, ${passwordHash}, 'business', true, true, true)
      RETURNING id, email, role
    `;
  }

  // 2. Find or create business profile
  let [businessProfile] = await sql`SELECT id, company_name FROM business_profiles WHERE user_id = ${user.id}`;
  if (!businessProfile) {
    console.log(`Creating business profile for ${manufacturerEmail}...`);
    [businessProfile] = await sql`
      INSERT INTO business_profiles (user_id, company_name, city, state, onboarding_complete)
      VALUES (${user.id}, 'Precision Auto & Industrial Works', 'Pune', 'Maharashtra', true)
      RETURNING id, company_name
    `;

    await sql`
      INSERT INTO organization_members (user_id, business_profile_id, org_role, status)
      VALUES (${user.id}, ${businessProfile.id}, 'admin', 'active')
      ON CONFLICT DO NOTHING
    `;
  }

  console.log(`Manufacturer ID: ${businessProfile.id} (${businessProfile.company_name})`);

  // 3. Create or find Requirements for this manufacturer
  let [req1] = await sql`
    SELECT id, title FROM manpower_requirements 
    WHERE manufacturer_id = ${businessProfile.id} AND title ILIKE '%Assembly%'
    LIMIT 1
  `;
  if (!req1) {
    [req1] = await sql`
      INSERT INTO manpower_requirements (
        manufacturer_id, title, description, industry, location, workers_required,
        required_skills, start_date, duration, experience_required, budget_min, budget_max,
        status, published_at
      )
      VALUES (
        ${businessProfile.id},
        '50 Industrial Assembly & Production Line Operators',
        'Urgent requirement for 50 skilled and semi-skilled assembly line workers for automotive component fabrication and packaging. Shifts: Rotational 8 hours. Safety equipment and training provided.',
        'Manufacturing & Engineering',
        'Pune, Maharashtra',
        50,
        ARRAY['Assembly', 'Machine Operation', 'Quality Check', 'Packaging'],
        CURRENT_DATE + INTERVAL '5 days',
        '6 Months (Extendable)',
        2,
        600.00,
        750.00,
        'PUBLISHED',
        NOW()
      )
      RETURNING id, title
    `;
    console.log(`Created Requirement 1: ${req1.title}`);
  }

  let [req2] = await sql`
    SELECT id, title FROM manpower_requirements 
    WHERE manufacturer_id = ${businessProfile.id} AND title ILIKE '%Welder%'
    LIMIT 1
  `;
  if (!req2) {
    [req2] = await sql`
      INSERT INTO manpower_requirements (
        manufacturer_id, title, description, industry, location, workers_required,
        required_skills, start_date, duration, experience_required, budget_min, budget_max,
        status, published_at
      )
      VALUES (
        ${businessProfile.id},
        '25 Certified Structural Welders & Fabricators',
        'Looking for 25 certified ARC / MIG welders and fitters for heavy steel structural fabrication work. Must have prior industrial experience and safety compliance.',
        'Heavy Fabrication',
        'Chakan MIDC, Pune',
        25,
        ARRAY['MIG Welding', 'ARC Welding', 'Structural Fitting', 'Blueprint Reading'],
        CURRENT_DATE + INTERVAL '10 days',
        '1 Year Contract',
        3,
        800.00,
        950.00,
        'PUBLISHED',
        NOW()
      )
      RETURNING id, title
    `;
    console.log(`Created Requirement 2: ${req2.title}`);
  }

  // 4. Ensure demo contractors exist
  const demoContractorsData = [
    {
      email: 'apex.contractor@craly-demo.com',
      company_name: 'Apex Industrial Manpower Services',
      city: 'Pune',
      state: 'Maharashtra',
      workforce_size: 150,
      years_experience: 8,
      phone: '+91 98230 11223',
    },
    {
      email: 'bharat.labour@craly-demo.com',
      company_name: 'Bharat Labour & Staffing Solutions',
      city: 'Mumbai',
      state: 'Maharashtra',
      workforce_size: 220,
      years_experience: 12,
      phone: '+91 98450 44556',
    },
    {
      email: 'shreeganesh.manpower@craly-demo.com',
      company_name: 'Shree Ganesh Technical Contractors',
      city: 'Pune',
      state: 'Maharashtra',
      workforce_size: 85,
      years_experience: 6,
      phone: '+91 98760 99887',
    },
  ];

  const contractorIds: string[] = [];
  for (const c of demoContractorsData) {
    let [cUser] = await sql`SELECT id FROM users WHERE email = ${c.email}`;
    if (!cUser) {
      const pwd = await hashPassword('Password123!');
      [cUser] = await sql`
        INSERT INTO users (email, password_hash, role, is_active, is_email_verified, is_phone_verified)
        VALUES (${c.email}, ${pwd}, 'contractor', true, true, true)
        RETURNING id
      `;
    }

    let [cProf] = await sql`SELECT id FROM contractor_profiles WHERE user_id = ${cUser.id}`;
    if (!cProf) {
      [cProf] = await sql`
        INSERT INTO contractor_profiles (
          user_id, company_name, city, state, workforce_size, years_experience, phone,
          verification_status, onboarding_complete
        )
        VALUES (
          ${cUser.id}, ${c.company_name}, ${c.city}, ${c.state}, ${c.workforce_size}, ${c.years_experience}, ${c.phone},
          'verified', true
        )
        RETURNING id
      `;
    }
    contractorIds.push(cProf.id);
  }

  // 5. Seed Applications
  const applicationsToSeed = [
    {
      requirement_id: req1.id,
      contractor_id: contractorIds[0],
      proposed_workforce: 50,
      availability_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      relevant_experience: 'Over 8 years managing automotive assembly line operations. We currently deploy 150+ trained workers in Chakan & Talegaon MIDC.',
      message: 'We can deploy the full batch of 50 workers within 3 business days. All workers are verified and equipped with safety gear.',
      proposed_rate: 680.00,
      status: 'SUBMITTED',
    },
    {
      requirement_id: req1.id,
      contractor_id: contractorIds[1],
      proposed_workforce: 45,
      availability_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      relevant_experience: '12+ years experience in industrial manpower across Maharashtra with ISO certified compliance and full PF/ESIC coverage.',
      message: 'Ready to mobilize 45 skilled operators with full supervision and on-site attendance management.',
      proposed_rate: 650.00,
      status: 'UNDER_REVIEW',
    },
    {
      requirement_id: req2.id,
      contractor_id: contractorIds[2],
      proposed_workforce: 25,
      availability_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      relevant_experience: 'Specialized fabrication contractor. All 25 welders hold valid 3G/6G certifications and heavy engineering background.',
      message: 'We have 25 certified MIG/ARC welders ready for immediate site inspection and weld-test evaluation.',
      proposed_rate: 890.00,
      status: 'SUBMITTED',
    },
    {
      requirement_id: req2.id,
      contractor_id: contractorIds[0],
      proposed_workforce: 20,
      availability_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      relevant_experience: 'Supplying certified fitters and structural welders to leading EPC infrastructure clients.',
      message: 'Can supply 20 certified welders with valid medical fitness certificates and safety gear.',
      proposed_rate: 850.00,
      status: 'SHORTLISTED',
    },
  ];

  for (const app of applicationsToSeed) {
    const [existingApp] = await sql`
      SELECT id FROM applications 
      WHERE requirement_id = ${app.requirement_id} AND contractor_id = ${app.contractor_id}
    `;

    if (!existingApp) {
      await sql`
        INSERT INTO applications (
          requirement_id, contractor_id, proposed_workforce, availability_date,
          relevant_experience, message, proposed_rate, status, created_at, updated_at
        )
        VALUES (
          ${app.requirement_id}, ${app.contractor_id}, ${app.proposed_workforce}, ${app.availability_date},
          ${app.relevant_experience}, ${app.message}, ${app.proposed_rate}, ${app.status},
          NOW() - INTERVAL '2 hours', NOW()
        )
      `;
      console.log(`Created application for Requirement ${app.requirement_id} from Contractor ${app.contractor_id}`);
    } else {
      console.log(`Application already exists for Requirement ${app.requirement_id}`);
    }
  }

  // 6. Add notifications for manufacturer
  await sql`
    INSERT INTO notifications (user_id, type, title, message, reference_id, is_read, created_at)
    VALUES 
      (${user.id}, 'application', 'New Application Received', 'Apex Industrial Manpower submitted an application for 50 Assembly Operators', ${req1.id}, false, NOW()),
      (${user.id}, 'application', 'New Application Received', 'Shree Ganesh Technical submitted an application for 25 Certified Welders', ${req2.id}, false, NOW())
    ON CONFLICT DO NOTHING
  `;

  console.log('✅ Demo applications successfully seeded for testing03@gmail.com!');
  process.exit(0);
}

seedDemoApplications().catch((err) => {
  console.error('Error seeding demo applications:', err);
  process.exit(1);
});
