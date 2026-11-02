// ===== frontend/src/app/privacy/page.js =====
// Privacy policy for the website and the Auto Pro staff app. The Google Play
// and App Store listings link here (and to #delete-account).
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Auto Pro Repairs Sales & Services",
  description: "How Auto Pro Repairs Sales & Services LLC collects, uses and protects your information on our website and in the Auto Pro app.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "November 2, 2026";

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-10 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="bg-gray-50 min-h-screen pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated {UPDATED}</p>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          <p className="text-gray-700 leading-relaxed">
            Auto Pro Repairs Sales &amp; Services LLC (&ldquo;Auto Pro,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) runs the
            website autoprorepairs.com and the Auto Pro app. This policy explains what information we collect, why, who we
            share it with, and the choices you have. We do not sell your personal information, and we do not use it for
            advertising.
          </p>

          <Section id="collect" title="Information we collect">
            <p><strong>Customers.</strong> When you request an appointment, send us a message, or have your vehicle serviced
              or buy a vehicle from us, we collect your name, phone number, email address, mailing address, vehicle details
              (year, make, model, VIN, plate, mileage), the work requested and performed, estimates, invoices, payments, and
              any signature you give to approve repairs or accept an invoice.</p>
            <p><strong>Staff using the Auto Pro app.</strong> The app is for Auto Pro employees only. It uses your work email
              and password to sign you in, and records the actions you take in it (for example time-clock punches, job notes,
              expenses, mileage trips and receipt photos you choose to take). The camera is used only when you tap to photograph
              a receipt.</p>
            <p><strong>Automatically.</strong> Our servers keep standard technical logs (such as IP address, browser type and
              time of request) for security and troubleshooting. If you turn on notifications, we store a notification token
              for your device.</p>
          </Section>

          <Section id="use" title="How we use it">
            <ul className="list-disc pl-5 space-y-1">
              <li>To schedule appointments, perform and document repairs, and sell vehicles.</li>
              <li>To send estimates, invoices, receipts and updates such as &ldquo;your vehicle is ready&rdquo; by text or email.</li>
              <li>To keep accurate business, payroll and tax records as required by law, including Florida sales tax and IRS records.</li>
              <li>To keep our systems secure and fix problems.</li>
            </ul>
          </Section>

          <Section id="share" title="Who we share it with">
            <p>We share information only with service providers that help us run the business, and only what they need:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> &mdash; secure database, file storage and sign-in.</li>
              <li><strong>Vercel</strong> &mdash; website hosting.</li>
              <li><strong>Resend</strong> &mdash; sending email.</li>
              <li><strong>Twilio</strong> &mdash; sending text messages.</li>
              <li><strong>Anthropic</strong> &mdash; reading the amounts on receipt photos that staff upload (receipts are not used to train AI models).</li>
              <li>Our accountant or tax preparer, and government agencies when the law requires it.</li>
            </ul>
            <p>Payment card details are not stored by us.</p>
          </Section>

          <Section id="text" title="Text messages">
            <p>If you give us your mobile number, we may text you about your appointment, estimate, invoice or vehicle.
              Message and data rates may apply. Reply STOP to stop texts at any time, or HELP for help.</p>
          </Section>

          <Section id="security" title="Security and retention">
            <p>Information is encrypted in transit, and access is limited by role so each staff member sees only what their job
              needs. We keep repair, sales, payroll and tax records for as long as the law requires (generally at least seven
              years), and other information only as long as it is useful to serve you.</p>
          </Section>

          <Section id="delete-account" title="Your choices and deleting your data">
            <p>You can ask us to see, correct or delete your personal information. <strong>Staff</strong> can ask us to delete
              their Auto Pro app account at any time. Email{" "}
              <a className="text-blue-600 underline" href="mailto:service@autoprorepairs.com?subject=Delete%20my%20data">service@autoprorepairs.com</a>{" "}
              or call <a className="text-blue-600 underline" href="tel:3523395181">(352) 339-5181</a> from the email or phone
              number we have on file. We will confirm and complete the request within 30 days.</p>
            <p>When an app account is deleted, its sign-in is removed right away. Records we must keep by law (such as invoices,
              payroll and tax records) are kept for the required period and then deleted.</p>
          </Section>

          <Section id="children" title="Children">
            <p>Our website and app are not directed to children under 13, and we do not knowingly collect their information.</p>
          </Section>

          <Section id="changes" title="Changes and contact">
            <p>If we change this policy we will update the date above. Questions? Contact us:</p>
            <p>
              Auto Pro Repairs Sales &amp; Services LLC<br />
              806 Hood Ave, Leesburg, FL 34748<br />
              <a className="text-blue-600 underline" href="mailto:service@autoprorepairs.com">service@autoprorepairs.com</a> &middot;{" "}
              <a className="text-blue-600 underline" href="tel:3523395181">(352) 339-5181</a>
            </p>
          </Section>

          <p className="mt-10 text-sm text-gray-500">
            <Link href="/contact" className="text-blue-600 underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
