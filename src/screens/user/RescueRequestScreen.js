import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const RescueRequestScreen = ({ navigation }) => {
  const { getAuthHeaders } = useAuth();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({
    latitude: 10.8456,
    longitude: 106.8287,
  });
  const [address, setAddress] = useState('Quận 9, Thành phố Hồ Chí Minh, Việt Nam');
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const mapRef = useRef(null);

  const [region, setRegion] = useState({
    latitude: 10.8456,
    longitude: 106.8287,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập bị từ chối', 'Ứng dụng cần quyền truy cập vị trí để gửi cứu hộ.');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    setLocating(true);
    try {
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      updateLocationState(coords);
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại.');
    } finally {
      setLocating(false);
    }
  };

  const updateLocationState = async (coords) => {
    setLocation(coords);
    try {
      let reverse = await Location.reverseGeocodeAsync(coords);
      if (reverse.length > 0) {
        const addr = reverse[0];
        setAddress(`${addr.name || ''} ${addr.street || ''}, ${addr.district || ''}, ${addr.city || ''}`);
      }
    } catch (e) {
      console.log('Geocoding error:', e);
    }
  };

  const handleMapPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    updateLocationState(coords);
  };

  const uploadSingleImage = async (uri) => {
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop();
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

    const formData = new FormData();
    formData.append('file', { uri, name: filename, type: mimeType });

    const response = await fetch(`${API_URL}/upload/image`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload ảnh thất bại');
    const data = await response.json();
    return data.url;
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả tình trạng của bạn.');
      return;
    }
    if (!location) {
      Alert.alert('Thiếu thông tin', 'Vui lòng xác định vị trí để đội cứu hộ có thể tìm thấy bạn.');
      return;
    }

    setLoading(true);

    try {
      let uploadedUrls = [];
      if (images.length > 0) {
        setUploadingImages(true);
        try {
          uploadedUrls = await Promise.all(images.map(uploadSingleImage));
        } catch (uploadErr) {
          await new Promise((resolve, reject) => {
            Alert.alert(
              'Upload ảnh thất bại',
              'Không thể tải ảnh lên. Bạn có muốn gửi yêu cầu không có ảnh không?',
              [
                { text: 'Hủy', style: 'cancel', onPress: () => reject() },
                { text: 'Tiếp tục', onPress: () => resolve() },
              ]
            );
          });
        } finally {
          setUploadingImages(false);
        }
      }

      const body = {
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        images: uploadedUrls,
      };

      const response = await fetch(`${API_URL}/rescue-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Gửi thất bại', data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        return;
      }

      Alert.alert(
        '✅ Gửi thành công',
        'Yêu cầu cứu hộ của bạn đã được gửi đi. Đội cứu hộ sẽ sớm liên lạc với bạn.',
        [{ text: 'OK', onPress: () => navigation.navigate('RequestStatus') }]
      );

    } catch (error) {
      if (error) {
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.');
      }
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const getLoadingLabel = () => {
    if (uploadingImages) return `Đang tải ${images.length} ảnh...`;
    if (loading) return 'Đang gửi yêu cầu...';
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Mô tả tình trạng của bạn *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ví dụ: Nước đang dâng cao, có người già và trẻ em, cần di dời khẩn cấp..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.label}>Vị trí cứu hộ *</Text>
            <TouchableOpacity style={styles.currentLocBtn} onPress={getCurrentLocation} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color="#2E91FF" />
                : <Ionicons name="locate" size={20} color="#2E91FF" />
              }
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {location && (
                <Marker
                  coordinate={location}
                  draggable
                  onDragEnd={(e) => updateLocationState(e.nativeEvent.coordinate)}
                  title="Vị trí của bạn"
                  description="Kéo thả để điều chỉnh vị trí chính xác"
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerPulse} />
                    <MaterialCommunityIcons name="map-marker-radius" size={40} color="#FF4757" />
                  </View>
                </Marker>
              )}
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapTip}>Chạm vào bản đồ hoặc kéo Marker để chọn vị trí</Text>
            </View>
          </View>

          {address ? (
            <View style={styles.addressContainer}>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={18} color="#FF4757" />
                <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
              </View>
              <Text style={styles.coordsText}>
                Tọa độ: {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyAddress}>
              <Text style={styles.emptyAddressText}>Đang xác định địa chỉ...</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Hình ảnh hiện trường (không bắt buộc)</Text>
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={takePhoto} disabled={loading}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera" size={24} color="#2F3542" />
              </View>
              <Text style={styles.actionIconText}>Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={pickImage} disabled={loading}>
              <View style={styles.iconCircle}>
                <Ionicons name="images" size={24} color="#2F3542" />
              </View>
              <Text style={styles.actionIconText}>Thư viện</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={22} color="#FF4757" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {images.length > 0 && (
            <Text style={styles.imageCount}>{images.length} ảnh đã chọn</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.submitBtnText}>{getLoadingLabel()}</Text>
            </View>
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>GỬI YÊU CẦU CỨU HỘ</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Lưu ý: Đảm bảo GPS được bật để chúng tôi tìm thấy bạn nhanh nhất.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: 15 },
  infoCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  label: { fontSize: 16, fontWeight: 'bold', color: '#2F3542', marginBottom: 12 },
  textArea: {
    backgroundColor: '#F1F2F6', borderRadius: 12, padding: 15,
    fontSize: 15, color: '#2F3542', minHeight: 120,
  },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  currentLocBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8F4FF', justifyContent: 'center', alignItems: 'center',
  },
  mapWrapper: { height: height * 0.45, borderRadius: 15, overflow: 'hidden', position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 5,
    paddingHorizontal: 10, borderRadius: 20, alignItems: 'center',
  },
  mapTip: { fontSize: 11, color: '#747D8C', fontWeight: '600' },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPulse: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
  },
  addressContainer: {
    marginTop: 15, padding: 12, backgroundColor: '#FFF5F5',
    borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E0',
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  addressText: { fontSize: 14, color: '#2F3542', fontWeight: '600', flex: 1, marginLeft: 6 },
  coordsText: { fontSize: 12, color: '#A4B0BE', marginLeft: 24 },
  emptyAddress: { marginTop: 15, alignItems: 'center' },
  emptyAddressText: { fontSize: 13, color: '#A4B0BE', fontStyle: 'italic' },
  imageActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, marginTop: 10 },
  actionIconBtn: { alignItems: 'center' },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F2F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  actionIconText: { fontSize: 13, color: '#57606F', fontWeight: '500' },
  imagePreviewContainer: { paddingBottom: 5 },
  imageWrapper: { marginRight: 12, position: 'relative' },
  previewImage: { width: 100, height: 100, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 12 },
  imageCount: { fontSize: 12, color: '#747D8C', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#FF4757', padding: 18, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10,
    elevation: 8, shadowColor: '#FF4757', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  disabledBtn: { opacity: 0.7 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  note: { fontSize: 12, color: '#A4B0BE', textAlign: 'center', marginTop: 20, marginBottom: 30, fontStyle: 'italic' },
});

export default RescueRequestScreen;