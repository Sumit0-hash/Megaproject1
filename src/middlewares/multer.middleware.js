import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage, 
})

// Export different upload configurations
export const uploadFields = upload.fields([
  { name: "avtar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 }
]);

export const uploadAvatar = upload.single("avtar");
export const uploadCoverImage = upload.single("coverImage");