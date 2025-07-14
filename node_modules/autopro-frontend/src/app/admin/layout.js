// frontend/src/app/admin/layout.js
import "./admin.css";

export const metadata = {
  title: "Admin Portal - AUTO PRO",
  description: "Vehicle management system for AUTO PRO",
};

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}