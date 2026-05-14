import type { BrandEmail } from './brands'

const VEHICLE_LAUNCH = `<mc>
  <mc-head>
    <mc-title>Polestar 4 — Performance, redefined.</mc-title>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <auto-vehicle-hero
      image-url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"
      model="Polestar 4"
      tagline="Performance, redefined."
      specs="Range::320 mi|0–60::3.7s|HP::544|MSRP::$54,900"
      cta-label="Configure yours"
      cta-href="https://example.com/configure" />
  </mc-body>
</mc>`

const SERVICE_DUE = `<mc>
  <mc-head>
    <mc-title>Service is due — book today</mc-title>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <auto-service-reminder
      vehicle="2022 Tesla Model 3"
      service-type="Brake fluid + cabin filter"
      current-miles="37,420"
      due-miles="40,000"
      pct="94"
      due-date="before Aug 30"
      cta-label="Book service"
      cta-href="https://example.com/book" />
  </mc-body>
</mc>`

const TEST_DRIVE = `<mc>
  <mc-head>
    <mc-title>Your test drive is confirmed</mc-title>
  </mc-head>
  <mc-body background-color="#0f172a">
    <auto-test-drive-card
      vehicle="2026 Polestar 4 Long Range"
      image-url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"
      date="Saturday, May 17 2026"
      time="11:00 AM"
      dealer="Polestar SF · 550 Mission St"
      reschedule-href="https://example.com/reschedule"
      cta-href="https://example.com/calendar.ics" />
  </mc-body>
</mc>`

export const AUTO_EMAILS: BrandEmail[] = [
  { slug: 'launch',     title: 'Polestar 4 launch',         description: 'OEM vehicle launch hero with spec strip.',       category: 'marketing',     source: VEHICLE_LAUNCH },
  { slug: 'service',    title: 'Service due reminder',      description: 'Mileage-based service reminder with progress.', category: 'lifecycle',     source: SERVICE_DUE },
  { slug: 'test-drive', title: 'Test drive confirmation',   description: 'Booking confirmation with reschedule option.',  category: 'transactional', source: TEST_DRIVE },
]
