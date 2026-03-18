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
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const RescueRequestScreen = ({ navigation }) => {
  const { getAuthHeaders } = useAuth();

  const [description, setDescription]       = useState('');
  const [location, setLocation]             = useState({ latitude: 10.8456, longitude: 106.8287 });
  const [address, setAddress]               = useState('Quận 9, Thành phố Hồ Chí Minh, Việt Nam');
  const [images, setImages]                 = useState([]);
  const [imageUrls, setImageUrls]           = useState([]);
  const [loading, setLoading]               = useState(false);
  const [locating, setLocating]             = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showModal, setShowModal]           = useState(false);
  const [modalData, setModalData]           = useState({
    type: 'success', title: '', message: '', onPress: () => setShowModal(false),
  });
  const mapRef = useRef(null);

  const [region] = useState({
    latitude: 10.8456,
    longitude: 106.8287,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập bị từ chối', 'Ứng dụng cần quyền truy cập vị trí để gửi cứu hộ.');
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      updateLocationState(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
    } catch {
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại.');
    } finally {
      setLocating(false);
    }
  };

  const updateLocationState = async (coords) => {
    setLocation(coords);
    try {
      const reverse = await Location.reverseGeocodeAsync(coords);
      if (reverse.length > 0) {
        const a = reverse[0];
        setAddress(`${a.name || ''} ${a.street || ''}, ${a.district || ''}, ${a.city || ''}`);
      }
    } catch (e) {
      console.log('Geocoding error:', e);
    }
  };

  const handleMapPress = (e) => updateLocationState(e.nativeEvent.coordinate);

  const uploadSingleImage = async (uri) => {
    const filename = uri.split('/').pop();
    const ext      = filename.split('.').pop();
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Ứng dụng cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setImages((prev) => [...prev, result.assets[0].uri]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền bị từ chối', 'Ứng dụng cần quyền truy cập camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setImages((prev) => [...prev, result.assets[0].uri]);
  };

  const removeImage = (index) => {
    setImages((prev)    => prev.filter((_, i) => i !== index));
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const showError = (title, message) => {
    setModalData({ type: 'error', title, message, onPress: () => setShowModal(false) });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      showError('Thiếu thông tin', 'Vui lòng nhập mô tả tình trạng của bạn.');
      return;
    }
    if (!location) {
      showError('Thiếu thông tin', 'Vui lòng xác định vị trí để đội cứu hộ có thể tìm thấy bạn.');
      return;
    }

    setLoading(true);
    try {
      let uploadedUrls = [];
      if (images.length > 0) {
        setUploadingImages(true);
        try {
          uploadedUrls = await Promise.all(images.map(uploadSingleImage));
        } catch {
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

      const response = await fetch(`${API_URL}/rescue-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: description.trim(),
          latitude:    location.latitude,
          longitude:   location.longitude,
          images:      uploadedUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError('Gửi thất bại', data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        return;
      }

      // ✅ Sau khi thành công: popToTop dọn stack, rồi chuyển tab Trạng thái
      setModalData({
        type:    'success',
        title:   'Gửi thành công',
        message: 'Yêu cầu cứu hộ của bạn đã được gửi đi. Đội cứu hộ sẽ sớm liên lạc với bạn.',
        onPress: () => {
          setShowModal(false);
          navigation.popToTop();           // ← xóa RescueRequestScreen khỏi HomeStack
          navigation.navigate('Trạng thái'); // ← chuyển sang tab Trạng thái
        },
      });
      setShowModal(true);

    } catch {
      showError('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const getLoadingLabel = () => {
    if (uploadingImages) return `Đang tải ${images.length} ảnh...`;
    if (loading)         return 'Đang gửi yêu cầu...';
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Mô tả ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <MaterialCommunityIcons name="text-box-outline" size={18} color="#E8293A" />
            </View>
            <Text style={styles.label}>Mô tả tình trạng *</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Ví dụ: Nước đang dâng cao, có người già và trẻ em, cần di dời khẩn cấp..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* ── Vị trí ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="location-outline" size={18} color="#E8293A" />
              </View>
              <Text style={styles.label}>Vị trí cứu hộ *</Text>
            </View>
            <TouchableOpacity style={styles.locateBtn} onPress={getCurrentLocation} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <Ionicons name="locate" size={18} color="#2563EB" />
              }
              <Text style={styles.locateBtnText}>{locating ? 'Đang lấy...' : 'Vị trí tôi'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {location && (
                <Marker
                  coordinate={location}
                  draggable
                  onDragEnd={(e) => updateLocationState(e.nativeEvent.coordinate)}
                  title="Vị trí của bạn"
                  description="Kéo thả để điều chỉnh"
                >
                  <View style={styles.markerWrap}>
                    <View style={styles.markerPulse} />
                    <MaterialCommunityIcons name="map-marker-radius" size={40} color="#E8293A" />
                  </View>
                </Marker>
              )}
            </MapView>
            <View style={styles.mapTipBadge}>
              <Ionicons name="hand-left-outline" size={11} color="#64748B" />
              <Text style={styles.mapTipText}>Chạm hoặc kéo marker để chọn vị trí</Text>
            </View>
          </View>

          {address ? (
            <View style={styles.addressBox}>
              <Ionicons name="location" size={16} color="#E8293A" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.addressText} numberOfLines={2}>{address}</Text>
                <Text style={styles.coordsText}>
                  {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyAddressText}>Đang xác định địa chỉ...</Text>
          )}
        </View>

        {/* ── Hình ảnh ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="images-outline" size={18} color="#E8293A" />
            </View>
            <Text style={styles.label}>Hình ảnh hiện trường</Text>
          </View>

          <View style={styles.imageActions}>
            {[
              { icon: 'camera-outline', label: 'Chụp ảnh', onPress: takePhoto },
              { icon: 'images-outline',  label: 'Thư viện',  onPress: pickImage },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                style={styles.imageActionBtn}
                onPress={btn.onPress}
                disabled={loading}
              >
                <Ionicons name={btn.icon} size={22} color="#2563EB" />
                <Text style={styles.imageActionText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {images.length > 0 && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imgThumb}>
                    <Image source={{ uri }} style={styles.imgPreview} />
                    <TouchableOpacity style={styles.imgRemove} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={20} color="#E8293A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.imageCount}>{images.length} ảnh đã chọn</Text>
            </>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.submitText}>{getLoadingLabel()}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="send" size={20} color="#FFF" />
              <Text style={styles.submitText}>GỬI YÊU CẦU CỨU HỘ</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Đảm bảo GPS được bật để đội cứu hộ tìm thấy bạn nhanh nhất.
        </Text>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Custom Modal ── */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[
              styles.modalIconWrap,
              { backgroundColor: modalData.type === 'success' ? '#F0FDF4' : '#FFF0F1' },
            ]}>
              <Ionicons
                name={modalData.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={38}
                color={modalData.type === 'success' ? '#16A34A' : '#E8293A'}
              />
            </View>
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <Text style={styles.modalMessage}>{modalData.message}</Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: modalData.type === 'success' ? '#16A34A' : '#E8293A' },
              ]}
              onPress={modalData.onPress}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent:    { padding: 16, paddingTop: 12 },

  card:             { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardHeaderRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardIconWrap:     { width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFF0F1', justifyContent: 'center', alignItems: 'center' },
  label:            { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  textArea:         { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 110, borderWidth: 1, borderColor: '#E2E8F0', lineHeight: 22 },

  locateBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  locateBtnText:    { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  mapWrapper:       { height: height * 0.38, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  map:              { ...StyleSheet.absoluteFillObject },
  mapTipBadge:      { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  mapTipText:       { fontSize: 11, color: '#64748B', fontWeight: '600' },
  markerWrap:       { alignItems: 'center', justifyContent: 'center' },
  markerPulse:      { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(232,41,58,0.12)' },

  addressBox:       { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, backgroundColor: '#FFF5F6', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFCDD0' },
  addressText:      { fontSize: 13, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  coordsText:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  emptyAddressText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },

  imageActions:     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  imageActionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#EFF6FF', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  imageActionText:  { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  imgThumb:         { marginRight: 10, position: 'relative' },
  imgPreview:       { width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  imgRemove:        { position: 'absolute', top: -7, right: -7, backgroundColor: '#FFF', borderRadius: 10 },
  imageCount:       { fontSize: 12, color: '#64748B', marginTop: 10, textAlign: 'center', fontWeight: '500' },

  submitBtn:        { backgroundColor: '#E8293A', padding: 17, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#E8293A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  submitText:       { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  note:             { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16, fontStyle: 'italic', lineHeight: 18 },

  modalOverlay:     { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  modalBox:         { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  modalIconWrap:    { width: 70, height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalTitle:       { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3 },
  modalMessage:     { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  modalButton:      { paddingVertical: 13, paddingHorizontal: 36, borderRadius: 14 },
  modalButtonText:  { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

export default RescueRequestScreen;