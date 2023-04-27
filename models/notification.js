const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: "users",
			index: true
		},
		type: {
			type: String,
			enum: ["USER", "PROJECT"],
			required: true
		},
		project: {
			type: Schema.Types.ObjectId,
			ref: "projects",
			index: true
		},
		payload: {
			// initiator_name: {
			// 	type: String,
			// 	required: true
			// },
			// message: {
			// type: String,
			// required: true
			// initiator_profile: {
			// 	type: String
			// },
			// is_actionable: {
			// 	type: Boolean,
			// 	default: false
			// },
			// action_title: {
			// 	type: String
			// },
			// redirect_url: {
			// 	type: String,
			// 	required: true
			// }
		},
		is_read: {
			type: Boolean,
			default: false,
			index: true
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

module.exports = mongoose.model('notifications', NotificationSchema);
