import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import pool from "../config/database.js";

/* ================= GOOGLE CONFIG ================= */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================= MICROSOFT TOKEN VERIFY ================= */
const verifyMicrosoftToken = async (accessToken) => {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 8000,
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable =
        !err.response || status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
};

/* ================= MICROSOFT LOGIN ================= */
export const microsoftLogin = async (req, res) => {
  try {
    const { token } = req.body; // ACCESS TOKEN (Graph)

    const msUser = await verifyMicrosoftToken(token);

    const email = msUser.mail || msUser.userPrincipalName;
    const name = msUser.displayName;

    if (!email) {
      return res.status(400).json({ message: "Email not found in Microsoft account" });
    }

    const [[user]] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    // ❌ Block non-admin-added users
    if (!user) {
      return res.status(403).json({
        error: "USER_NOT_REGISTERED",
        message: "Please contact HR Manager to add your email",
      });
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        provider: "microsoft",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

  res.json({
  token: jwtToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

  } catch (err) {
    console.error("Microsoft login error:", err.response?.data || err.message);
    const status = err.response?.status;

    if (!err.response || status === 429 || (status >= 500 && status < 600)) {
      return res.status(503).json({
        error: "MS_TEMPORARY_ERROR",
        message: "Microsoft service temporarily unavailable. Please retry.",
      });
    }

    return res.status(401).json({ message: "Microsoft login failed" });
  }
};

/* ================= GOOGLE LOGIN ================= */
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();

    const [[user]] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!user) {
      return res.status(403).json({
        message: "Access denied. Contact HR Manager.",
      });
    }

    /* ========== 2FA ENABLED ========= */
    if (user.two_factor_enabled) {
      return res.json({
        requireOTP: true,
        userId: user.id,
      });
    }

    /* ========== 2FA SETUP ========= */
    let base32 = user.two_factor_secret;
    let otpauth_url;

    if (!base32) {
      const secret = speakeasy.generateSecret({
        name: `HR Portal (${email})`,
      });

      base32 = secret.base32;
      otpauth_url = secret.otpauth_url;

      await pool.query(
        "UPDATE users SET two_factor_secret = ? WHERE id = ?",
        [base32, user.id]
      );
    } else {
      otpauth_url = speakeasy.otpauthURL({
        secret: base32,
        label: `HR Portal (${email})`,
        issuer: "HR Portal",
        encoding: "base32",
      });
    }

    res.json({
      setup2FA: true,
      qrCode: otpauth_url,
      manualKey: base32,
      userId: user.id,
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: "Login failed" });
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const [[user]] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: String(otp),
      window: 3,
    });

    if (!verified) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    await pool.query(
      "UPDATE users SET two_factor_enabled = 1 WHERE id = ?",
      [userId]
    );

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
  token: jwtToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

  } catch (err) {
    console.error("OTP error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};
export const getMyProfile = async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};


// import jwt from "jsonwebtoken";
// import speakeasy from "speakeasy";
// import { OAuth2Client } from "google-auth-library";
// import db from "../config/database.js";
// import pool from "../config/database.js";


// // import jwt from "jsonwebtoken";
// import jwksClient from "jwks-rsa";
// import axios from "axios";

// const verifyMicrosoftToken = async (token) => {
//   const response = await axios.get(
//     "https://graph.microsoft.com/v1.0/me",
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     }
//   );

//   return response.data;
// };

// // After getting Microsoft profile email
// const email = microsoftUser.mail || microsoftUser.userPrincipalName;


// // 🔴 CHECK IN DB
// const [users] = await pool.query(
//   "SELECT * FROM users WHERE email = ?",
//   [email]
// );

// if (users.length === 0) {
//   return res.status(403).json({
//     error: "USER_NOT_REGISTERED",
//     message: "Please contact admin to add your email",
//   });
// }


// export const microsoftLogin = async (req, res) => {
//   try {
//     const { token } = req.body;

//     const msUser = await verifyMicrosoftToken(token);

//     const email = msUser.mail || msUser.userPrincipalName;
//     const name = msUser.displayName;

//     const [[user]] = await db.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );

//     // ❌ Block non-admin-added users
//     if (!user) {
//       return res.status(403).json({
//         message: "Access denied. Contact admin."
//       });
//     }

//     const jwtToken = jwt.sign(
//       {
//         id: user.id,
//         email: user.email,
//         role: user.role,
//         provider: "microsoft"
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({ token: jwtToken });

//   } catch (err) {
//     console.error("Microsoft login error:", err);
//     res.status(401).json({ message: "Microsoft login failed" });
//   }
// };

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// /* ================= GOOGLE LOGIN ================= */
// export const googleLogin = async (req, res) => {
//   try {
//     const { token } = req.body;

//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const { name, email } = ticket.getPayload();

//     const [[user]] = await db.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );

//     // ❌ BLOCK non-admin-added users
//     if (!user) {
//       return res.status(403).json({
//         message: "Access denied. Contact admin."
//       });
//     }

//     /* ================= 2FA ENABLED ================= */
//     if (user.two_factor_enabled) {
//       return res.json({
//         requireOTP: true,
//         userId: user.id
//       });
//     }

//     /* ================= 2FA SETUP ================= */
//     let base32 = user.two_factor_secret;
//     let otpauth_url;

//     if (!base32) {
//       const secret = speakeasy.generateSecret({
//         name: `HR Portal (${email})`
//       });

//       base32 = secret.base32;
//       otpauth_url = secret.otpauth_url;

//       await db.query(
//         "UPDATE users SET two_factor_secret = ? WHERE id = ?",
//         [base32, user.id]
//       );
//     } else {
//       otpauth_url = speakeasy.otpauthURL({
//         secret: base32,
//         label: `HR Portal (${email})`,
//         issuer: "HR Portal",
//         encoding: "base32"
//       });
//     }

//     res.json({
//       setup2FA: true,
//       qrCode: otpauth_url,
//       manualKey: base32,
//       userId: user.id
//     });

//   } catch (err) {
//     console.error("Google login error:", err);
//     res.status(401).json({ message: "Login failed" });
//   }
// };

// /* ================= VERIFY OTP ================= */
// export const verifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;

//     const [[user]] = await db.query(
//       "SELECT * FROM users WHERE id = ?",
//       [userId]
//     );

//     const verified = speakeasy.totp.verify({
//       secret: user.two_factor_secret,
//       encoding: "base32",
//       token: String(otp),
//       window: 3
//     });

//     if (!verified) {
//       return res.status(401).json({ message: "Invalid OTP" });
//     }

//     await db.query(
//       "UPDATE users SET two_factor_enabled = 1 WHERE id = ?",
//       [userId]
//     );

//     const jwtToken = jwt.sign(
//       {
//         id: user.id,
//         email: user.email,
//         role: user.role
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({ token: jwtToken });

//   } catch (err) {
//     console.error("OTP error:", err);
//     res.status(500).json({ message: "OTP verification failed" });
//   }
// };
// export const getMyProfile = async (req, res) => {
//   try {
//     const [[user]] = await pool.query(
//       "SELECT id, name, email, role FROM users WHERE id = ?",
//       [req.user.id]
//     );

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json(user);
//   } catch (err) {
//     console.error("Profile fetch error:", err);
//     res.status(500).json({ message: "Failed to fetch profile" });
//   }
// };



// // import jwt from "jsonwebtoken";
// // import speakeasy from "speakeasy";
// // import { OAuth2Client } from "google-auth-library";
// // import db from "../config/database.js";

// // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // // ================= GOOGLE LOGIN =================
// // export const googleLogin = async (req, res) => {
// //   try {
// //     const { token } = req.body;

// //     const ticket = await client.verifyIdToken({
// //       idToken: token,
// //       audience: process.env.GOOGLE_CLIENT_ID,
// //     });

// //     const { name, email } = ticket.getPayload();

// //     const [[existingUser]] = await db.query(
// //       "SELECT * FROM users WHERE email = ?",
// //       [email]
// //     );

// //     let user = existingUser;

// //     // ================= FIRST USER =================
// //     if (!user) {
// //       await db.query(
// //         "INSERT INTO users (name, email, role) VALUES (?, ?, 'HR')",
// //         [name, email]
// //       );

// //       const [[newUser]] = await db.query(
// //         "SELECT * FROM users WHERE email = ?",
// //         [email]
// //       );

// //       user = newUser;
// //     }

// //     // ================= 2FA ENABLED =================
// //     if (user.two_factor_enabled) {
// //       return res.json({
// //         requireOTP: true,
// //         userId: user.id
// //       });
// //     }

// //     // ================= 2FA SETUP =================
// //     let base32 = user.two_factor_secret;
// //     let otpauth_url;

// //     // Generate secret ONLY ONCE
// //     if (!base32) {
// //       const secret = speakeasy.generateSecret({
// //         name: `HR Portal (${email})`
// //       });

// //       base32 = secret.base32;
// //       otpauth_url = secret.otpauth_url;

// //       await db.query(
// //         "UPDATE users SET two_factor_secret = ? WHERE id = ?",
// //         [base32, user.id]
// //       );
// //     } else {
// //       // 🔥 Reconstruct QR URL from stored secret
// //       otpauth_url = speakeasy.otpauthURL({
// //         secret: base32,
// //         label: `HR Portal (${email})`,
// //         issuer: "HR Portal",
// //         encoding: "base32"
// //       });
// //     }

// //     return res.json({
// //       setup2FA: true,
// //       qrCode: otpauth_url,
// //       manualKey: base32,
// //       userId: user.id
// //     });

// //   } catch (err) {
// //     console.error("Google login error:", err);
// //     res.status(401).json({ message: "Login failed" });
// //   }
// // };

// // // ================= VERIFY OTP =================
// // export const verifyOTP = async (req, res) => {
// //   try {
// //     const { userId, otp } = req.body;

// //     if (!userId || !otp) {
// //       return res.status(400).json({ message: "Missing userId or otp" });
// //     }

// //     const [[user]] = await db.query(
// //       "SELECT * FROM users WHERE id = ?",
// //       [userId]
// //     );

// //     if (!user || !user.two_factor_secret) {
// //       return res.status(400).json({ message: "2FA not initialized" });
// //     }

// //     const verified = speakeasy.totp.verify({
// //       secret: user.two_factor_secret,
// //       encoding: "base32",
// //       token: String(otp).trim(),
// //       window: 3
// //     });

// //     if (!verified) {
// //       return res.status(401).json({ message: "Invalid OTP" });
// //     }

// //     await db.query(
// //       "UPDATE users SET two_factor_enabled = 1 WHERE id = ?",
// //       [userId]
// //     );

// //     const jwtToken = jwt.sign(
// //       {
// //         id: user.id,
// //         name: user.name,
// //         email: user.email,
// //         role: user.role
// //       },
// //       process.env.JWT_SECRET,
// //       { expiresIn: "1d" }
// //     );

// //     res.json({ token: jwtToken });

// //   } catch (err) {
// //     console.error("OTP verification crash:", err);
// //     res.status(500).json({ message: "OTP verification failed" });
// //   }
// // };

// // // import jwt from "jsonwebtoken";
// // // import speakeasy from "speakeasy";
// // // import { OAuth2Client } from "google-auth-library";
// // // import db from "../config/database.js";

// // // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // // // ================= GOOGLE LOGIN =================
// // // export const googleLogin = async (req, res) => {
// // //   try {
// // //     const { token } = req.body;

// // //     const ticket = await client.verifyIdToken({
// // //       idToken: token,
// // //       audience: process.env.GOOGLE_CLIENT_ID,
// // //     });

// // //     const { name, email } = ticket.getPayload();

// // //     const [rows] = await db.query(
// // //       "SELECT * FROM users WHERE email=?",
// // //       [email]
// // //     );

// // //     let user = rows[0];

// // //     // ================= FIRST-TIME USER =================
// // //     if (!user) {
// // //       await db.query(
// // //         "INSERT INTO users (name, email, role) VALUES (?, ?, 'HR')",
// // //         [name, email]
// // //       );

// // //       const [[newUser]] = await db.query(
// // //         "SELECT * FROM users WHERE email=?",
// // //         [email]
// // //       );
// // //       user = newUser;
// // //     }

// // //     // ================= USER WITH 2FA ENABLED =================
// // //     if (user.two_factor_enabled) {
// // //       return res.json({
// // //         requireOTP: true,
// // //         userId: user.id,
// // //       });
// // //     }

// // //     // ================= FIRST LOGIN / INCOMPLETE 2FA =================
// // //     let secret = user.two_factor_secret;

// // //     // generate secret ONLY ONCE
// // //     if (!secret) {
// // //       const generated = speakeasy.generateSecret({ length: 20 });
// // //       secret = generated.base32;

// // //       await db.query(
// // //         "UPDATE users SET two_factor_secret=? WHERE id=?",
// // //         [secret, user.id]
// // //       );
// // //     }

// // //     return res.json({
// // //       setup2FA: true,
// // //      qrCode: secret.otpauth_url, // 🔥 THIS
// // //       manualKey: secret,
// // //       userId: user.id,
// // //     });

// // //   } catch (err) {
// // //     console.error("Google login error:", err);
// // //     res.status(401).json({ message: "Login failed" });
// // //   }
// // // };

// // // // ================= VERIFY OTP =================
// // // // export const verifyOTP = async (req, res) => {
// // // //   try {
// // // //      console.log("verifyOTP body:", req.body);
// // // //     const { userId, otp } = req.body;

// // // //     const [[user]] = await db.query(
// // // //       "SELECT * FROM users WHERE id=?",
// // // //       [userId]
// // // //     );

// // // //     if (!user || !user.two_factor_secret) {
// // // //       return res.status(400).json({ message: "2FA not initialized" });
// // // //     }

// // // //     const verified = speakeasy.totp.verify({
// // // //       secret: user.two_factor_secret,
// // // //       encoding: "base32",
// // // //       token: otp,
// // // //       window: 3
// // // //     });

// // // //     if (!verified) {
// // // //       return res.status(401).json({ message: "Invalid OTP" });
// // // //     }

// // // //     await db.query(
// // // //       "UPDATE users SET two_factor_enabled=1 WHERE id=?",
// // // //       [userId]
// // // //     );

// // // //     const jwtToken = jwt.sign(
// // // //       {
// // // //         id: user.id,
// // // //         name: user.name,
// // // //         email: user.email,
// // // //         role: user.role,
// // // //       },
// // // //       process.env.JWT_SECRET,
// // // //       { expiresIn: "1d" }
// // // //     );

// // // //     res.json({ token: jwtToken });

// // // //   } catch (err) {
// // // //     console.error("OTP verification error:", err);
// // // //     res.status(500).json({ message: "OTP verification failed" });
// // // //   }
// // // // };

// // // export const verifyOTP = async (req, res) => {
// // //   try {
// // //     const { userId, otp } = req.body;

// // //     if (!userId || !otp) {
// // //       return res.status(400).json({ message: "Missing userId or otp" });
// // //     }

// // //     const [[user]] = await db.query(
// // //       "SELECT * FROM users WHERE id = ?",
// // //       [userId]
// // //     );

// // //     if (!user) {
// // //       return res.status(400).json({ message: "User not found" });
// // //     }

// // //     if (!user.two_factor_secret) {
// // //       return res.status(400).json({ message: "2FA secret not found" });
// // //     }

// // //     const cleanOtp = String(otp).replace(/\s+/g, "");

// // //     const verified = speakeasy.totp.verify({
// // //       secret: user.two_factor_secret,
// // //       encoding: "base32",
// // //       token: cleanOtp,
// // //       window: 3
// // //     });

// // //     if (!verified) {
// // //       return res.status(401).json({ message: "Invalid OTP" });
// // //     }

// // //     await db.query(
// // //       "UPDATE users SET two_factor_enabled = 1 WHERE id = ?",
// // //       [userId]
// // //     );

// // //     const jwtToken = jwt.sign(
// // //       {
// // //         id: user.id,
// // //         name: user.name,
// // //         email: user.email,
// // //         role: user.role
// // //       },
// // //       process.env.JWT_SECRET,
// // //       { expiresIn: "1d" }
// // //     );

// // //     res.json({ token: jwtToken });

// // //   } catch (err) {
// // //     console.error("OTP verification crash:", err);
// // //     res.status(500).json({
// // //       message: "Internal OTP verification error"
// // //     });
// // //   }
// // // };


// // // // import jwt from "jsonwebtoken";
// // // // import speakeasy from "speakeasy";
// // // // import { OAuth2Client } from "google-auth-library";
// // // // import  db  from "../config/database.js";

// // // // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // // // // ================= GOOGLE LOGIN =================
// // // // export const googleLogin = async (req, res) => {
// // // //   try {
// // // //     const { token } = req.body;

// // // //     const ticket = await client.verifyIdToken({
// // // //       idToken: token,
// // // //       audience: process.env.GOOGLE_CLIENT_ID
// // // //     });

// // // //     const { name, email } = ticket.getPayload();

// // // //     const [rows] = await db.query(
// // // //       "SELECT * FROM users WHERE email=?",
// // // //       [email]
// // // //     );

// // // //     let user = rows[0];

// // // //     // First-time HR
// // // //     if (!user) {
// // // //       await db.query(
// // // //         "INSERT INTO users (name, email, role) VALUES (?, ?, 'HR')",
// // // //         [name, email]
// // // //       );

// // // //       const [newUser] = await db.query(
// // // //         "SELECT * FROM users WHERE email=?",
// // // //         [email]
// // // //       );
// // // //       user = newUser[0];
// // // //     }

// // // //     // If Authenticator already enabled
// // // //     if (user.two_factor_enabled) {
// // // //       return res.json({
// // // //         requireOTP: true,
// // // //         userId: user.id
// // // //       });
// // // //     }

// // // //     // First login → generate Authenticator secret
// // // //     const secret = speakeasy.generateSecret({ length: 20 });

// // // //     await db.query(
// // // //       "UPDATE users SET two_factor_secret=? WHERE id=?",
// // // //       [secret.base32, user.id]
// // // //     );

// // // //     res.json({
// // // //       setup2FA: true,
// // // //       manualKey: secret.base32,
// // // //       userId: user.id
// // // //     });

// // // //   } catch (err) {
// // // //     console.error("Google login error:", err);
// // // //     res.status(401).json({ message: "Login failed" });
// // // //   }
// // // // };

// // // // // ================= VERIFY OTP =================
// // // // export const verifyOTP = async (req, res) => {
// // // //   const { userId, otp } = req.body;

// // // //   const [[user]] = await db.query(
// // // //     "SELECT * FROM users WHERE id=?",
// // // //     [userId]
// // // //   );

// // // //   const verified = speakeasy.totp.verify({
// // // //     secret: user.two_factor_secret,
// // // //     encoding: "base32",
// // // //     token: otp,
// // // //     window: 1
// // // //   });

// // // //   if (!verified) {
// // // //     return res.status(401).json({ message: "Invalid OTP" });
// // // //   }

// // // //   await db.query(
// // // //     "UPDATE users SET two_factor_enabled=true WHERE id=?",
// // // //     [userId]
// // // //   );

// // // //   const jwtToken = jwt.sign(
// // // //     {
// // // //       id: user.id,
// // // //       name: user.name,
// // // //       email: user.email,
// // // //       role: user.role
// // // //     },
// // // //     process.env.JWT_SECRET,
// // // //     { expiresIn: "1d" }
// // // //   );

// // // //   res.json({ token: jwtToken });
// // // // };
