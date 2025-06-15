const AssignmentSubmission = require('../models/assignmentSubmissionModel');
const Course = require('../models/courseModel');
const { createError } = require('../utils/error');
const path = require('path');
const fs = require('fs');

const createAssignmentUploadDir = () => {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const assignmentsDir = path.join(uploadDir, 'assignments');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir); // Ensure uploads folder exists
  if (!fs.existsSync(assignmentsDir)) fs.mkdirSync(assignmentsDir); // Create assignments folder
};
createAssignmentUploadDir();


// Submit assignment
exports.uploadAssignment = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(createError(400, 'No file uploaded'));
        }
 
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(__dirname, '..', 'uploads', 'assignments', fileName);
 
        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);
 
        // Return the full URL that can be used to access the file
        const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/assignments/${fileName}`;
 
        res.status(200).json({
            success: true,
            fileUrl
        });
    } catch (error) {
        next(error);
    }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const { courseId, assignmentId } = req.params;

    // Check if course exists and user is enrolled
    const course = await Course.findById(courseId).populate('enrolledStudents');
    if (!course) return next(createError(404, 'Course not found'));

    if (!course.enrolledStudents.some(student => student._id.toString() === req.user._id.toString())) {
      return next(createError(403, 'You are not enrolled in this course'));
    }

    // Create or update submission
    let submission = await AssignmentSubmission.findOneAndUpdate(
      { student: req.user._id, assignmentId },
      {
        student: req.user._id,
        course: courseId,
        assignmentId,
        fileUrl: req.body.fileUrl || null,
        submittedAt: new Date()
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};


// View student's own submission
exports.getMySubmission = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const submission = await AssignmentSubmission.findOne({
      student: req.user._id,
      assignmentId
    });

    if (!submission) return next(createError(404, 'Submission not found'));

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};


// Grade a student's assignment submission
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    const submission = await AssignmentSubmission.findById(submissionId).populate('course');

    if (!submission) return next(createError(404, 'Submission not found'));

    if (submission.course.instructor.toString() !== req.user._id.toString()) {
      return next(createError(403, 'You are not authorized to grade this submission'));
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedAt = new Date();

    await submission.save();

    res.status(200).json({ success: true, message: 'Graded successfully', data: submission });
  } catch (error) {
    next(error);
  }
};

// Get all submissions for an assignment
exports.getAllSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await AssignmentSubmission.find({ assignmentId })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};


exports.getSubmissionsByCourseAndAssignment = async (req, res, next) => {
  try {
    const { courseId, assignmentId } = req.params;

    // Fetch submissions for the given course and assignment
    const submissions = await AssignmentSubmission.find({ course: courseId, assignmentId: assignmentId })
      .populate('student', 'username email')
      .populate('course', 'title');

    if (!submissions.length) {
      return res.status(404).json({ success: false, message: 'No submissions found for this course and assignment' });
    }

    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Fetch the course and filter assignments from its content
    const course = await Course.findById(courseId).populate('instructor', 'name email');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Filter assignments from the course content
    const assignments = course.content.filter((item) => item.type === 'Assignment');

    if (!assignments.length) {
      return res.status(404).json({ success: false, message: 'No assignments found for this course' });
    }

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};
