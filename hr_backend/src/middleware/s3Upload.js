import multer from "multer";

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only PDF/DOC/DOCX allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(), // 🔥 IMPORTANT
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export default upload;

// import multer from "multer";
// import multerS3 from "multer-s3";
// import path from "path";
// import s3 from "../config/s3.js";

// const fileFilter = (req, file, cb) => {
//   const allowed = [
//     "application/pdf",
//     "application/msword",
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//   ];

//   if (!allowed.includes(file.mimetype)) {
//     return cb(new Error("Only PDF/DOC/DOCX allowed"), false);
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage: multerS3({
//     s3,
//     bucket: process.env.AWS_S3_BUCKET,
//     acl: "private",
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     key: (req, file, cb) => {
//       const ext = path.extname(file.originalname);
//       const fileName = `resumes/${Date.now()}-${file.originalname
//         .replace(/\s+/g, "_")}`;
//       cb(null, fileName);
//     },
//   }),
//   fileFilter,
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
// });

// export default upload;
