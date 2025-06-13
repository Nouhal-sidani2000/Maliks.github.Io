const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendStatusNotification = async (to, status, company, branch) => {
  const subject = `Your lead for "${company}" was ${status}`;
  const html = `
    <p>Hello,</p>
    <p>A new lead for <strong>${company}</strong> has been <strong>${status.toUpperCase()}</strong>.</p>
    <p>This lead was submitted from the <strong>${branch}</strong> branch.</p>
    <p>Thank you,<br/>CRM Team</p>
  `;

  await transporter.sendMail({
    from: `"CRM Notifications" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = { sendStatusNotification };
