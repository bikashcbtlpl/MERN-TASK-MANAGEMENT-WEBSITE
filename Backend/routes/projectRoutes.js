const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionMiddleware');

// All routes require authentication
router.use(authenticate);

router.post('/', checkPermission(["Create Project"]), projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', checkPermission(["Edit Project"]), projectController.updateProject);
router.delete('/:id', checkPermission(["Delete Project"]), projectController.deleteProject);

module.exports = router;
