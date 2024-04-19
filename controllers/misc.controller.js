const asyncHandler = require("express-async-handler");
const S3 = require("@configs/S3");
const { DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");


exports.uploadAll = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const files = req.files;
	console.log("filll: ", files);
	responseObject.message = "Successfully uploaded all";
	responseObject.code = 201;
	responseObject.result = {
		filename: files[0].originalname,
		url: files[0].location,
	};
	return res.success(responseObject);
});

exports.uploadAllChat = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const files = req.files;
	// console.log("filll: ", files);
	responseObject.message = "Successfully uploaded all";
	responseObject.code = 201;
	responseObject.result = [];
	for (let i = 0; i < files.length; i++)
	{
		responseObject.result.push({
			name: files[i].originalname,
			url: files[i].location,
		});
	}
	return res.success(responseObject);
});

exports.deleteFile = asyncHandler(async (req, res) =>
{
	let responseObject = {};
	const { filename } = req.params;

	const deleteResponse = await S3.send(new DeleteObjectCommand({
		Bucket: process.env.AWS_BUCKET_NAME,
		Key: req.user._id + "_" + filename,
	}));

	responseObject.message = "Successfully deleted";
	responseObject.code = 202;
	responseObject.result = deleteResponse;

	return res.success(responseObject);
});

exports.getFile = asyncHandler(async (req, res) =>
{
	const { filename } = req.params;

	const response = await S3.send(new GetObjectCommand({
		Bucket: process.env.AWS_BUCKET_NAME,
		Key: req.user._id + "_" + filename,
	}));

	const stream = await response.Body.transformToByteArray();

	res.set('Content-Disposition', `attachment; filename="${filename}"`);
	res.set('Content-Type', 'application/octet-stream');
	res.send(Buffer.from(stream));
});
