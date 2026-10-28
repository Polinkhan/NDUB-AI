# NDUB Student Portal Postman collection

Import `NDUB-Student-Portal.postman_collection.json` into Postman.

## Setup

1. Open the collection's **Variables** tab.
2. Set `username` and `password` to your NDUB Student Portal credentials.
3. Run **Authentication → Login**. The test script saves the returned access and refresh tokens automatically.
4. Run **Get Semester List**, then update `semesterId` if needed.
5. Run **Get Running Courses**, then update `runningCourseId` if needed.

All protected requests inherit bearer authentication from the collection. **Refresh Session** uses `refreshToken` instead and updates the stored tokens.

## Included endpoints

- Login and session refresh
- Student profile
- Offered courses
- Semester list
- Running courses
- Course details
- Attendance summary
- Class attendance
- Routine period list
- Program routine

Examples are based on the exported response structures but contain sanitized placeholder values. No real credentials, tokens, or student details are included.
