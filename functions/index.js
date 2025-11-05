/**
 * ATiempo Cloud Functions (Gen 2, Node.js 22)
 * --------------------------------------------
 * Provides a unified Express-based backend for:
 *  - Sending registration emails
 *  - Submitting new hire forms (with file uploads)
 *  - Updating hire status
 *  - Sending welcome emails with QR codes
 *
 * All endpoints are fully CORS-enabled and production safe.
 */

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import Busboy from "busboy";
import QRCode from "qrcode";
import admin from "firebase-admin";
import functions from "firebase-functions/v2";

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ✅ Express app (handles all routes)
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Email transport (Gmail service)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || functions.config().email?.user,
    pass: process.env.EMAIL_PASS || functions.config().email?.pass,
  },
});

// ===============================================================
// 🔹 SEND REGISTRATION EMAIL
// ===============================================================
app.post("/sendRegistrationEmail", async (req, res) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !email) {
      return res.status(400).json({ status: "error", message: "Missing name or email" });
    }

    const mailOptions = {
      from: transporter.options.auth.user,
      to: email,
      subject: "Bienvenido a ATiempo",
      html: `
        <p>Hola ${nombre},</p>
        <p>Bienvenido al sistema ATiempo. Para completar tu registro, haz clic en el siguiente enlace:</p>
        <a href="https://atiempo-9f08a.web.app/registro_empleado.html">Formulario de Registro</a>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration email sent to ${email}`);
    return res.json({ status: "success", message: "Email enviado con éxito" });
  } catch (err) {
    console.error("❌ Error in sendRegistrationEmail:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ===============================================================
// 🔹 SUBMIT NEW HIRE
// ===============================================================
app.post("/submitNewHire", async (req, res) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const uploads = {};

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname, file, filename) => {
      const filepath = `${Date.now()}_${filename}`;
      const fileUpload = bucket.file(filepath);

      file.pipe(fileUpload.createWriteStream())
        .on("error", (err) => console.error("Upload error:", err))
        .on("finish", () => {
          uploads[fieldname] = `https://storage.googleapis.com/${bucket.name}/${filepath}`;
        });
    });

    busboy.on("finish", async () => {
      try {
        const docRef = await db.collection("new_hires").add({
          ...fields,
          archivos: uploads,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ New hire submitted: ${docRef.id}`);
        return res.json({ status: "success", id: docRef.id });
      } catch (err) {
        console.error("❌ Firestore error:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }
    });

    busboy.end(req.rawBody);
  } catch (err) {
    console.error("❌ Error in submitNewHire:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ===============================================================
// 🔹 UPDATE HIRE STATUS
// ===============================================================
app.post("/updateHireStatus", async (req, res) => {
  try {
    const { id, status, comment } = req.body;
    if (!id || !status) {
      return res.status(400).json({ status: "error", message: "Missing id or status" });
    }

    const hireRef = db.collection("new_hires").doc(id);
    const doc = await hireRef.get();

    if (!doc.exists) {
      return res.status(404).json({ status: "error", message: "Hire not found" });
    }

    const hireData = doc.data();
    await hireRef.update({
      status,
      ...(comment ? { comment } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (status === "approved") {
      const qrData = `atiempo-employee-id:${id}`;
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      const mailOptions = {
        from: transporter.options.auth.user,
        to: hireData.email_personal || hireData.email || "",
        subject: "Bienvenido a ATiempo - Confirmación",
        html: `
          <p>Hola ${hireData.nombre_completo || "Empleado"},</p>
          <p>Tu registro en ATiempo ha sido aprobado. Aquí está tu código QR único para el control de asistencia:</p>
          <p><img src="${qrCodeUrl}" alt="QR Code" /></p>
          <p>Por favor guarda este correo para futuras referencias.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${hireData.email}`);
    }

    return res.json({ status: "success", message: `Hire ${id} updated to ${status}` });
  } catch (err) {
    console.error("❌ Error in updateHireStatus:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ===============================================================
// 🔹 SEND WELCOME EMAIL (Manual Trigger)
// ===============================================================
app.post("/sendWelcomeEmail", async (req, res) => {
  try {
    const { id, email, nombre } = req.body;
    if (!id || !email || !nombre) {
      return res.status(400).json({ status: "error", message: "Missing id, name or email" });
    }

    const qrData = `atiempo-employee-id:${id}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);

    const mailOptions = {
      from: transporter.options.auth.user,
      to: email,
      subject: "Bienvenido a ATiempo - Confirmación",
      html: `
        <p>Hola ${nombre},</p>
        <p>Tu registro en ATiempo ha sido aprobado. Adjuntamos tu código QR único, que deberás usar para el control de asistencia.</p>
        <p><img src="${qrCodeUrl}" alt="QR Code" /></p>
        <p>Por favor guarda este correo para futuras referencias.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return res.json({ status: "success", message: "Welcome email enviado con éxito" });
  } catch (err) {
    console.error("❌ Error in sendWelcomeEmail:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// ===============================================================
// 🔹 Root route (for health checks)
// ===============================================================
app.get("/", (req, res) => {
  res.send("✅ ATiempo API is running successfully.");
});

// ===============================================================
// ✅ Export one unified Gen 2 HTTPS function
// ===============================================================
export const api = functions.https.onRequest(app);
