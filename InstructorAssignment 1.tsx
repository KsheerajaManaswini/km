import React, { useState, useEffect} from 'react';
import { assignmentService } from '../../services/assignmentService.ts';

interface Course {
  _id: string;
  title: string;
}

interface Assignment {
  _id: string;
  title: string;
}

interface Student {
  username: string;
  email: string;
}

interface Submission {
  _id: string;
  student: Student;
  submittedAt: string;
  fileUrl: string;
  grade?: number;
  feedback?: string;
}

const InstructorAssignmentDashboard: React.FC= () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [gradeInput, setGradeInput] = useState<{ [key: string]: number }>({});
  const [feedbackInput, setFeedbackInput] = useState<{ [key: string]: string }>({});

  // Fetch courses created by the instructor
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await assignmentService.getCourses();
        setCourses(coursesData);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch courses');
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch assignments for the selected course
  const fetchAssignments = async (courseId: string) => {
    try {
      setLoading(true);
      const assignmentsData = await assignmentService.getAssignments(courseId);
      setAssignments(assignmentsData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assignments');
      setLoading(false);
    }
  };

  // Fetch submissions for the selected course and assignment
  const fetchSubmissions = async (courseId: string, assignmentId: string) => {
    try {
      setLoading(true);
      const submissionsData = await assignmentService.getSubmissions(courseId, assignmentId);
      setSubmissions(submissionsData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions');
      setLoading(false);
    }
  };

  // Handle course selection
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    setSelectedAssignment(''); // Reset assignment selection
    setSubmissions([]); // Clear submissions
    fetchAssignments(courseId);
  };

  // Handle assignment selection
  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assignmentId = e.target.value;
    setSelectedAssignment(assignmentId);
    fetchSubmissions(selectedCourse, assignmentId);
  };

  // Handle grade and feedback changes
  const handleGradeChange = (id: string, value: number) => {
    setGradeInput((prev) => ({ ...prev, [id]: value }));
  };

  const handleFeedbackChange = (id: string, value: string) => {
    setFeedbackInput((prev) => ({ ...prev, [id]: value }));
  };

  // Grade a submission
  const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      setLoading(true);
      await assignmentService.gradeSubmission(submissionId, grade, feedback);
      alert('Submission graded successfully');
      fetchSubmissions(selectedCourse, selectedAssignment); // Refresh submissions after grading
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to grade submission');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Instructor Assignment Dashboard</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Course Selection */}
      <div>
        <label htmlFor="courseSelect">Select Course:</label>
        <select id="courseSelect" value={selectedCourse} onChange={handleCourseChange}>
          <option value="">-- Select a Course --</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Assignment Selection */}
      {selectedCourse && (
        <div>
          <label htmlFor="assignmentSelect">Select Assignment:</label>
          <select id="assignmentSelect" value={selectedAssignment} onChange={handleAssignmentChange}>
            <option value="">-- Select an Assignment --</option>
            {assignments.map((assignment) => (
              <option key={assignment._id} value={assignment._id}>
                {assignment.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Submission List */}
      {selectedAssignment && (
        <div>
          <h2>Submissions</h2>
          {submissions.length === 0 && <p>No submissions found for this assignment.</p>}
          {submissions.map((submission) => (
            <div key={submission._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <p><strong>Student:</strong> {submission.student.username} ({submission.student.email})</p>
              <p><strong>Submitted At:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
              <p><strong>File:</strong> <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">View File</a></p>
              <p><strong>Grade:</strong> {submission.grade ?? 'Not graded yet'}</p>
              <p><strong>Feedback:</strong> {submission.feedback ?? 'No feedback yet'}</p>

              {/* Grade Submission */}
              <div>
                <label htmlFor={`grade-${submission._id}`}>Grade:</label>
                <input
                  type="number"
                  id={`grade-${submission._id}`}
                  value={gradeInput[submission._id] || ''}
                  onChange={(e) => handleGradeChange(submission._id, parseInt(e.target.value, 10))}
                  placeholder="Enter grade"
                />
                <label htmlFor={`feedback-${submission._id}`}>Feedback:</label>
                <input
                  type="text"
                  id={`feedback-${submission._id}`}
                  value={feedbackInput[submission._id] || ''}
                  onChange={(e) => handleFeedbackChange(submission._id, e.target.value)}
                  placeholder="Enter feedback"
                />
                <button
                  onClick={() => {
                    const grade = gradeInput[submission._id];
                    const feedback = feedbackInput[submission._id];
                    gradeSubmission(submission._id, grade, feedback);
                  }}
                >
                  Submit Grade
                </button>
              </div>
            </div> 
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorAssignmentDashboard;