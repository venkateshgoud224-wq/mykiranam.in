const nodemailer = require('nodemailer');
require('dotenv').config();

const testMail = async () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log({ host, port, user, pass });

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: user,
      to: user,
      subject: "Test Mail",
      text: "This is a test mail"
    });
    console.log("Success:", info.messageId);
  } catch (err) {
    console.error("Error:", err);
  }
};

testMail();
