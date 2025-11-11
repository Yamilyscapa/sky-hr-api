# Mobile App Integration Prompt - Liveness Detection

## Objective
Integrate the new liveness detection feature into the SkyHR mobile app. The backend now automatically detects potential photo/print spoofing attempts during check-in.

## Background
The API backend has been updated to automatically analyze image quality and detect potential spoofing attempts (photos, prints) during check-in. This requires **minimal to no changes** to your existing check-in implementation.

### How It Works (Backend Detection)
The backend uses AWS Rekognition's `DetectFaces` API to analyze image quality metrics:
- **Sharpness Analysis**: Photos/prints typically have lower sharpness scores than live camera captures
- **Brightness Analysis**: Extreme brightness/darkness patterns can indicate printed photos
- **Quality Metrics**: AWS Rekognition analyzes the image server-side and returns quality scores

**Important**: The frontend doesn't need to verify anything - the backend automatically analyzes every image sent to the check-in endpoint. You just send the image as before (base64 encoded), and the backend returns whether it detected potential spoofing.

## What Changed in the API

### Request Format
**No changes required** - The check-in endpoint accepts the same request format:
```json
POST /attendance/check-in
{
  "organization_id": "string",
  "location_id": "string",
  "image": "base64_encoded_image",
  "latitude": "string",
  "longitude": "string"
}
```

### Response Format
The response now includes additional fields:
```json
{
  "message": "Attendance recorded successfully",
  "data": {
    "id": "uuid",
    "check_in": "2024-01-15T10:30:00Z",
    "user_id": "string",
    "organization_id": "string",
    "location_id": "uuid",
    "status": "on_time",
    "face_confidence": "99.99",        // Existing field
    "liveness_score": "85.5",           // NEW: 0-100 score
    "spoof_flag": false,                // NEW: true if spoof detected
    "is_verified": true,
    "is_within_geofence": true,
    // ... other existing fields
  }
}
```

## Implementation Tasks

### Task 1: Update TypeScript/Type Definitions (Required)
Update your check-in response type to include the new fields:

```typescript
interface CheckInResponse {
  message: string;
  data: {
    id: string;
    check_in: string;
    user_id: string;
    organization_id: string;
    location_id: string;
    status: string;
    face_confidence: string;
    liveness_score: string | null;  // NEW
    spoof_flag: boolean;             // NEW
    is_verified: boolean;
    is_within_geofence: boolean;
    // ... other fields
  };
}
```

### Task 2: Handle Spoof Flags (Recommended)
Add logic to handle cases where spoofing is detected:

```typescript
// After successful check-in API call
const response = await checkInAPI({
  organization_id: orgId,
  location_id: locationId,
  image: base64Image,
  latitude: lat.toString(),
  longitude: lng.toString()
});

if (response.data.spoof_flag) {
  // Option A: Show warning but allow check-in
  Alert.alert(
    "Image Quality Warning",
    "The system detected potential issues with image quality. Your check-in was recorded, but may require admin review.",
    [{ text: "OK" }]
  );
  
  // Option B: Require retry
  Alert.alert(
    "Verification Failed",
    "Please try again with better lighting and ensure you're using a live camera, not a photo.",
    [
      { text: "Retry", onPress: () => retryCheckIn() },
      { text: "Cancel", style: "cancel" }
    ]
  );
}
```

### Task 3: Display Liveness Information (Optional)
Show liveness score in attendance details:

```typescript
// In your attendance detail screen
<View>
  <Text>Face Confidence: {attendance.face_confidence}%</Text>
  {attendance.liveness_score && (
    <Text>Liveness Score: {parseFloat(attendance.liveness_score).toFixed(1)}%</Text>
  )}
  {attendance.spoof_flag && (
    <View style={styles.warning}>
      <Text style={styles.warningText}>
        ⚠️ Potential spoofing detected
      </Text>
    </View>
  )}
</View>
```

### Task 4: Provide User Feedback (Optional)
Give users feedback about image quality:

```typescript
const livenessScore = parseFloat(response.data.liveness_score || "0");

if (livenessScore < 50) {
  showToast("Low image quality detected. Please ensure good lighting.");
} else if (livenessScore < 70) {
  showToast("Image quality is acceptable but could be better.");
} else {
  showToast("Image quality verified ✓");
}
```

## Testing Checklist

- [ ] Test normal check-in with live camera - should work as before
- [ ] Test with photo of a face - should flag as spoof
- [ ] Test with printed photo - should flag as spoof
- [ ] Verify response includes `liveness_score` and `spoof_flag` fields
- [ ] Test error handling when spoof is detected
- [ ] Verify UI displays liveness information (if implemented)

## API Endpoint Details

**Endpoint:** `POST /attendance/check-in`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  organization_id: string;
  location_id: string;
  image: string;        // Base64 encoded image
  latitude: string;
  longitude: string;
}
```

**Response Codes:**
- `200` - Check-in successful (may include spoof_flag: true)
- `400` - Bad request (missing fields, invalid image)
- `401` - Unauthorized
- `403` - Forbidden (face doesn't match, similarity too low, or location not allowed)

## Error Handling

The API may return errors in these cases:
1. **Face doesn't match** - `spoof_flag` won't be in response (check-in failed)
2. **Similarity too low** - Check-in rejected before liveness check
3. **Spoof detected** - Check-in may still succeed but `spoof_flag: true`

## Configuration

The backend uses these thresholds (configurable):
- **Liveness Threshold**: 50 (minimum score to be considered "live")
- **Sharpness Threshold**: 50 (minimum sharpness)
- **Brightness Range**: 20-80 (acceptable range)

## FAQ

### Q: How can the backend detect photos if I'm just sending a base64 image?
**A**: The backend uses AWS Rekognition's image analysis capabilities. When you send an image (whether from camera or photo), AWS Rekognition analyzes:
- Image sharpness (photos/prints are typically less sharp)
- Brightness patterns (printed photos have different lighting characteristics)
- Overall image quality metrics

The backend receives your image, sends it to AWS Rekognition for analysis, and AWS returns quality metrics. Our code then evaluates these metrics to determine if it's likely a photo/print.

### Q: Do I need to install any AWS packages in the mobile app?
**A**: No! The backend handles all AWS Rekognition calls. You just send the image as you always have (base64 string), and the backend does the analysis.

### Q: Can someone still spoof with a high-quality photo?
**A**: This is a basic detection method using image quality. A very high-quality photo might pass, but most photos/prints will be detected. For stronger protection, we can implement AWS Face Liveness API (requires video capture), but that would require frontend changes.

### Q: What happens if spoof_flag is true?
**A**: The check-in still succeeds, but the flag indicates potential spoofing. You can:
- Show a warning to the user
- Require admin approval
- Log for review
- Or reject the check-in (your choice)

## Questions?

If you encounter issues or need clarification:
1. Check the API documentation: `API_DOCUMENTATION.md`
2. Review the integration guide: `EXPO_LIVENESS_INTEGRATION.md`
3. Contact the backend team for threshold adjustments

## Example Implementation

Here's a complete example of how to integrate:

```typescript
import { Alert } from 'react-native';

async function handleCheckIn(
  orgId: string,
  locationId: string,
  imageBase64: string,
  lat: number,
  lng: number
) {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: orgId,
        location_id: locationId,
        image: imageBase64,
        latitude: lat.toString(),
        longitude: lng.toString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Check-in failed');
    }

    // Handle spoof detection
    if (data.data.spoof_flag) {
      Alert.alert(
        'Verification Warning',
        'Image quality issues detected. Your check-in was recorded but may require review.',
        [{ text: 'OK' }]
      );
    }

    // Show success
    Alert.alert('Success', 'Check-in recorded successfully');
    
    return data.data;
  } catch (error) {
    Alert.alert('Error', error.message || 'Check-in failed');
    throw error;
  }
}
```

## Next Steps

1. **Update your types** to include new response fields
2. **Test the API** with your existing check-in flow
3. **Add spoof handling** (recommended)
4. **Optional enhancements**: Display liveness info, provide user feedback

---

**Note**: The backend automatically handles all liveness detection - you just need to handle the response fields. No changes to image capture or API request format are required.

