const express = require("express");
const router = express.Router();
const { hasPermission, hasProjectAccess, attachProjectData } = require("@middlewares/authorization.middleware");
const { fetchProjectListForUser, createNewProject, fetchProjectDetails, updateProjectDetails, deleteProject, fetchProjectMembers, addMemberToProject, removeMemberFromProject, updateProjectMemberDetails, fetchSearchedProjects, invitationAction, fetchInvitedProjectDetails, fetchChatsForProject, sendChatMessage, createOrJoinCollabSession, leaveCollabSession, inviteToCollab, sendPersonalChatMessage, fetchPersonalChatForProject, fetchPersonalChatsForProject, createPersonalMessageEnitity } = require("@controllers/project.controller");
const { fetchTasksForProject, fetchTaskDetails, addTasktoProject, updateTaskDetails, fetchSubTasksForTask } = require("@controllers/task.controller");

// PROJECTS
router.route(`/`).get(fetchProjectListForUser);
router.route(`/`).post(createNewProject);
router.route(`/search/:searchQuery`).get(fetchSearchedProjects);
router.route(`/:project_id`).get(attachProjectData, hasProjectAccess, fetchProjectDetails);
router.route(`/:project_id/invite-action`).get(fetchInvitedProjectDetails);
router.route(`/:project_id`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateProjectDetails);
router.route(`/:project_id`).delete(attachProjectData, hasProjectAccess, hasPermission(["OWNER"]), deleteProject);
router.route(`/:project_id/chat`).get(attachProjectData, hasProjectAccess, fetchChatsForProject);
router.route(`/:project_id/chat`).post(attachProjectData, hasProjectAccess, sendChatMessage);
router.route(`/:project_id/personal_chat/:chat_id`).get(attachProjectData, hasProjectAccess, fetchPersonalChatForProject);
router.route(`/:project_id/personal_chats`).get(attachProjectData, hasProjectAccess, fetchPersonalChatsForProject);
router.route(`/:project_id/personal_chat/:chat_id`).post(attachProjectData, hasProjectAccess, sendPersonalChatMessage);
router.route(`/:project_id/personal_chat`).post(attachProjectData, hasProjectAccess, createPersonalMessageEnitity);
router.route(`/:project_id/collab`).get(attachProjectData, hasProjectAccess, createOrJoinCollabSession);
router.route(`/:project_id/collab/:collabId`).post(attachProjectData, hasProjectAccess, inviteToCollab);
router.route(`/:project_id/collab/:collabId`).delete(attachProjectData, hasProjectAccess, leaveCollabSession);

// MEMBERS
router.route(`/:project_id/members`).get(attachProjectData, hasProjectAccess, fetchProjectMembers);
router.route(`/:project_id/members`).post(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), addMemberToProject);
router.route(`/:project_id/members/:user_id`).delete(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), removeMemberFromProject);
router.route(`/:project_id/members/:user_id`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateProjectMemberDetails);
router.route(`/:project_id/invite-action`).post(invitationAction);


// TASKS
router.route(`/:project_id/tasks`).get(attachProjectData, hasProjectAccess, fetchTasksForProject);
router.route(`/:project_id/tasks`).post(attachProjectData, hasProjectAccess, addTasktoProject);
router.route(`/:project_id/tasks/:task_key`).get(attachProjectData, hasProjectAccess, fetchTaskDetails);
router.route(`/:project_id/tasks/:task_key`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateTaskDetails);
router.route(`/:project_id/tasks/:parent_task/subtasks`).get(attachProjectData, hasProjectAccess, fetchSubTasksForTask);

module.exports = router;
