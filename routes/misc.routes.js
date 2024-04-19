const express = require("express");
const router = express.Router();
const multer = require("multer");
const multerS3 = require("multer-s3");
const { uploadAll, deleteFile, getFile, uploadAllChat } = require("@controllers/misc.controller");

const upload = multer({
	storage: multerS3({
		s3: require("../configs/S3"),
		acl: "public-read",
		bucket: process.env.AWS_BUCKET_NAME,
		key: function (req, file, cb)
		{
			cb(null, req.user._id + "_" + file.originalname);
		}
	})
});


router.route(`/upload-all`).post(upload.array("files"), uploadAll);
router.route(`/upload-all-chat`).post(upload.array("files"), uploadAllChat);
router.route(`/delete/:filename`).delete(upload.single("files"), deleteFile);
router.route(`/download/:filename`).get(getFile);

module.exports = router;
