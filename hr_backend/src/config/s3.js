
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export const s3 = new S3Client({
  region: "ap-south-1",
  endpoint: "https://s3.ap-south-1.amazonaws.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
}); 

export default s3;



// import { S3Client } from "@aws-sdk/client-s3";
// import dotenv from "dotenv";

// dotenv.config();

// export const s3 = new S3Client({
//   region: "ap-south-1", // or us-east-1
//   endpoint: "https://s3.ap-south-1.amazonaws.com",
//   forcePathStyle: false,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY,
//     secretAccessKey: process.env.AWS_SECRET_KEY,
//   },
  
// });

// console.log("AWS_ACCESS_KEY:", process.env.AWS_ACCESS_KEY);
// console.log("AWS_SECRET_KEY:", process.env.AWS_SECRET_KEY);
// console.log("typeof access key:", typeof process.env.AWS_ACCESS_KEY);


// export default s3;



// // import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// // const client = new S3Client({
// //   region: "ap-south-1",
// //   endpoint: "https://s3.ap-south-1.amazonaws.com",
// //   credentials: {
// //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
// //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// //   },
// // });

// // await client.send(
// //   new PutObjectCommand({
// //     Bucket: "hr-portal-resumes",
// //     Key: "debug/test.txt",
// //     Body: "S3 WORKS",
// //   })
// // );

// // console.log("✅ S3 upload SUCCESS");

// // export default client;

// // // import { S3Client } from "@aws-sdk/client-s3";

// // // const s3 = new S3Client({
// // //      region: "ap-south-1", // 🔥 FORCE the correct region
// // //     credentials: {
// // //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
// // //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// // //   },
// // // });

// // // export default s3;
