const express = require("express");
const router = express.Router();
const { hasPermission, hasProjectAccess, attachProjectData } = require("@middlewares/authorization.middleware");
const { fetchProjectListForUser, createNewProject, fetchProjectDetails, updateProjectDetails, deleteProject, fetchProjectMembers, addMemberToProject, removeMemberFromProject, updateProjectMemberDetails, fetchSearchedProjects, invitationAction } = require("@controllers/project.controller");
const { fetchTasksForProject, fetchTaskDetails, addTasktoProject, updateTaskDetails, fetchSubTasksForTask } = require("@controllers/task.controller");

// PROJECTS
router.route(`/`).get(fetchProjectListForUser);
router.route(`/`).post(createNewProject);
router.route(`/search/:searchQuery`).get(fetchSearchedProjects);
router.route(`/:project_id`).get(attachProjectData, hasProjectAccess, fetchProjectDetails);
router.route(`/:project_id`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateProjectDetails);
router.route(`/:project_id`).delete(attachProjectData, hasProjectAccess, hasPermission(["OWNER"]), deleteProject);

// MEMBERS
router.route(`/:project_id/members`).get(attachProjectData, hasProjectAccess, fetchProjectMembers);
router.route(`/:project_id/members`).post(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), addMemberToProject);
router.route(`/:project_id/members/:user_id`).delete(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), removeMemberFromProject);
router.route(`/:project_id/members/:user_id`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateProjectMemberDetails);
router.route(`/:project_id/invite-action`).post(attachProjectData, hasProjectAccess, invitationAction);


// TASKS
router.route(`/:project_id/tasks`).get(attachProjectData, hasProjectAccess, fetchTasksForProject);
router.route(`/:project_id/tasks`).post(attachProjectData, hasProjectAccess, addTasktoProject);
router.route(`/:project_id/tasks/:task_key`).get(attachProjectData, hasProjectAccess, fetchTaskDetails);
router.route(`/:project_id/tasks/:task_key`).patch(attachProjectData, hasProjectAccess, hasPermission(["ADMIN", "OWNER"]), updateTaskDetails);
router.route(`/:project_id/tasks/:task_key/subtasks`).get(attachProjectData, hasProjectAccess, fetchSubTasksForTask);

module.exports = router;
