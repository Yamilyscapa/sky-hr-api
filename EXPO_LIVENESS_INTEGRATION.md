# Expo App Integration - Liveness Detection

## Overview

The SkyHR API backend now includes automatic liveness detection to prevent photo/print spoofing during check-in. **No frontend changes are required** - the backend automatically analyzes image quality when processing check-in requests.

## What Changed

The backend now:
- Analyzes image quality metrics (brightness, sharpness) using AWS Rekognition
- Calculates a liveness score (0-100) for each check-in
- Flags potential spoof attempts (photos/prints) automatically
- Stores liveness scores and spoof flags in the attendance database

## Current Implementation

The liveness detection works **automatically** with your existing check-in flow:

1. **No API Changes**: The check-in endpoint (`POST /attendance/check-in`) accepts the same request format
2. **Same Image Format**: Continue sending base64-encoded images as before
3. **Automatic Analysis**: Backend analyzes image quality without any frontend changes

## Response Changes

The check-in response now includes additional fields:

```json
{
  "message": "Attendance recorded successfully",
  "data": {
    "id": "...",
    "check_in": "...",
    "face_confidence": "99.99",
    "liveness_score": "85.5",      // NEW: Liveness score (0-100)
    "spoof_flag": false,            // NEW: True if potential spoof detected
    "is_verified": true,
    // ... other fields
  }
}
```

## What You Need to Do

**Nothing!** The implementation is fully backend-based and works with your existing code.

However, you may want to:

### Optional: Display Liveness Information

If you want to show liveness information to users or admins:

1. **Display Liveness Score**: Show the `liveness_score` in the attendance details UI
2. **Warn on Spoof Flags**: If `spoof_flag` is `true`, you could display a warning or require admin approval
3. **Quality Feedback**: Use the liveness score to provide feedback to users about image quality

### Example: Handling Spoof Flags

```typescript
// In your Expo app
const checkInResponse = await checkInAPI({
  organization_id: orgId,
  location_id: locationId,
  image: base64Image,
  latitude: lat,
  longitude: lng
});

if (checkInResponse.data.spoof_flag) {
  // Show warning or require additional verification
  Alert.alert(
    "Verification Warning",
    "The system detected potential issues with the image quality. Please try again with better lighting."
  );
}
```

## How It Works

### Backend-Side Detection (No Frontend Changes Needed)

The backend automatically analyzes every image you send using AWS Rekognition's `DetectFaces` API:

1. **You send the image** (base64 string) to the check-in endpoint - same as before
2. **Backend receives the image** and sends it to AWS Rekognition for analysis
3. **AWS Rekognition analyzes** the image quality server-side:
   - **Sharpness**: Low sharpness indicates a photo/print (not a live face)
   - **Brightness**: Extreme brightness/darkness suggests photo/print
   - **Quality Metrics**: AWS returns numerical scores for these metrics
4. **Backend evaluates** the quality scores and calculates:
   - **Liveness Score**: 0-100 based on quality metrics
   - **Spoof Flag**: Boolean indicating if spoofing is likely detected
5. **Backend returns** the results in the check-in response

**Key Point**: The frontend doesn't need AWS packages or any special verification. You just send the image normally, and the backend does all the analysis server-side using AWS Rekognition.

### Thresholds

- **Liveness Threshold**: 50 (minimum score to be considered "live")
- **Sharpness Threshold**: 50 (minimum sharpness for live detection)
- **Brightness Range**: 20-80 (acceptable brightness range)

## Future Enhancements

If stricter liveness detection is needed in the future, we can implement AWS Rekognition's Face Liveness API, which would require:

- Video capture instead of single image
- Multi-step challenge-response flow
- Frontend integration with AWS Amplify FaceLivenessDetector

For now, the quality-based detection provides good protection with zero frontend changes.

## Testing

To test the liveness detection:

1. **Normal Check-in**: Use a live camera capture - should pass with high liveness score
2. **Photo Test**: Try checking in with a photo of a face - should flag as spoof
3. **Print Test**: Try checking in with a printed photo - should flag as spoof

## FAQ

### Q: How does the backend detect photos if I'm just sending a base64 image?
**A**: The backend uses AWS Rekognition's server-side image analysis. When you send any image (camera or photo), the backend:
1. Receives your base64 image
2. Sends it to AWS Rekognition's `DetectFaces` API
3. AWS analyzes image quality (sharpness, brightness, etc.) and returns metrics
4. Backend code evaluates these metrics to detect if it's likely a photo/print

### Q: Do I need to install AWS SDK or packages in the Expo app?
**A**: No! All AWS Rekognition calls happen on the backend. You just send the image as you always have - no AWS packages needed in the mobile app.

### Q: Can someone still bypass this with a high-quality photo?
**A**: This is a quality-based detection method. Very high-quality photos might pass, but most photos/prints will be detected. For stronger protection, we can implement AWS Face Liveness API (requires video capture), but that would need frontend changes.

### Q: What should I do if spoof_flag is true?
**A**: You have options:
- Show a warning but allow check-in
- Require the user to retry
- Log for admin review
- Reject the check-in (your choice)

## Questions?

If you have questions or need adjustments to the liveness detection thresholds, contact the backend team.

