import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapPreview from './MapPreview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import CameraCapture from './CameraCapture';
import { initializeApp, getApps } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const PROFILE_KEY = 'civicalert-mobile-profile';
const REPORTER_ID_KEY = 'civicalert-mobile-reporter-id';
const REPORT_STATUS_KEY = 'civicalert-mobile-report-statuses';
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
const priorityOptions = ['Normal', 'High', 'Critical'];

const deriveReporterId = (email = '') => {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized ? `mobile-${normalized}` : `mobile-device-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const statusColor = (status = 'Received') => ({
  Received: '#eaf7ef',
  Reviewing: '#eef4ff',
  InProgress: '#fff3d9',
  Resolved: '#eaf7ef',
}[status] || '#eef4ff');

const statusText = (status = 'Received') => ({
  Received: '#168556',
  Reviewing: '#1c4f9f',
  InProgress: '#b35a00',
  Resolved: '#168556',
}[status] || '#1c4f9f');

const formatReportTimestamp = (createdAt) => {
  if (!createdAt) return 'Date not available';

  let dateValue = createdAt;
  if (typeof createdAt?.toDate === 'function') {
    dateValue = createdAt.toDate();
  } else if (typeof createdAt?.seconds === 'number') {
    dateValue = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === 'string') {
    dateValue = new Date(createdAt);
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Date not available';

  return parsedDate.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function App() {
  const [view, setView] = useState('report');
  const [categories, setCategories] = useState([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [priority, setPriority] = useState('Normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState([]);
  const [identified, setIdentified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [visibleEmergencyContactCount, setVisibleEmergencyContactCount] = useState(1);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
  ]);
  const [sosExpanded, setSosExpanded] = useState(true);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerItems, setPhotoViewerItems] = useState([]);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [donationDialogVisible, setDonationDialogVisible] = useState(true);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6;
  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  useEffect(() => {
    if (!bannerMessage) return undefined;

    const timeout = setTimeout(() => setBannerMessage(''), 4000);
    return () => clearTimeout(timeout);
  }, [bannerMessage]);

  const mapRegion = {
    latitude: Number(latitude) || 27.7172,
    longitude: Number(longitude) || 85.324,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
        const result = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setCategories(result);
        if (result[0] && !selectedCategory) setSelectedCategory(result[0]);
      } catch (error) {
        Alert.alert('Categories unavailable', error.message || 'Unable to load categories.');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadSavedProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          setProfile(parsed);
          setName(parsed.name || '');
          setEmail(parsed.email || '');
          setPhone(parsed.phone || '');
          setPassword(parsed.password || '');
          setIsEmailVerified(Boolean(parsed.isEmailVerified));
          setLocation(parsed.location || '');
          setLocationName(parsed.locationName || parsed.location || '');
          setLatitude(parsed.latitude ?? '');
          setLongitude(parsed.longitude ?? '');
          setProfileDirty(false);
          if (Array.isArray(parsed.emergencyContacts) && parsed.emergencyContacts.length) {
            const savedContacts = Array.from({ length: 3 }, (_, index) => ({
              name: parsed.emergencyContacts[index]?.name || '',
              email: parsed.emergencyContacts[index]?.email || '',
              phone: parsed.emergencyContacts[index]?.phone || '',
            }));
            setEmergencyContacts(savedContacts);
            setVisibleEmergencyContactCount(Math.min(Math.max(parsed.emergencyContacts.length, 1), 3));
            // Collapse the section if contacts are already saved
            const hasValidContacts = parsed.emergencyContacts.some(c => c.name && c.email && c.phone);
            setSosExpanded(!hasValidContacts);
          }

          const firestoreProfile = await getDoc(doc(db, 'userProfiles', parsed.email));
          if (firestoreProfile.exists()) {
            const firestoreData = firestoreProfile.data();
            setProfile((current) => ({ ...current, ...firestoreData }));
            setPassword(firestoreData.password || parsed.password || '');
            setIsEmailVerified(Boolean(firestoreData.isEmailVerified));
            const savedContacts = Array.isArray(firestoreData.emergencyContacts)
              ? firestoreData.emergencyContacts
              : [];
            const hydratedContacts = Array.from({ length: 3 }, (_, index) => ({
              name: savedContacts[index]?.name || '',
              email: savedContacts[index]?.email || '',
              phone: savedContacts[index]?.phone || '',
            }));
            setEmergencyContacts(hydratedContacts);
            setVisibleEmergencyContactCount(Math.min(Math.max(savedContacts.length, 1), 3));
            // Collapse the section if contacts are already saved
            const hasValidContacts = savedContacts.some(c => c.name && c.email && c.phone);
            setSosExpanded(!hasValidContacts);
          }
          setIdentified(false);
        }
      } catch (error) {
        console.log('Profile load error:', error);
      }
    };

    loadSavedProfile();
  }, []);

  useEffect(() => {
    if (!profile?.email || !profile?.isEmailVerified) return;

    let active = true;
    let pollTimer;

    const notifyStatusChange = async (report) => {
      if (Platform.OS === 'web') return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'CivicAlert status update',
            body: `${report.title || 'Your report'} is now ${report.status || 'updated'}.`,
            data: { reportId: report.id, status: report.status },
          },
          trigger: null,
        });
      } catch (error) {
        console.log('Status notification failed:', error.message || error);
      }
    };

    const loadReports = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'reports'));
        const userEmail = String(profile.email).trim().toLowerCase();
        
        const filtered = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((report) => {
            const reportEmail = String(report.email || '').trim().toLowerCase();
            return reportEmail === userEmail;
          })
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        const storedStatuses = JSON.parse(await AsyncStorage.getItem(REPORT_STATUS_KEY) || '{}');
        const nextStatuses = { ...storedStatuses };
        const hasBaseline = Object.keys(storedStatuses).length > 0;
        if (hasBaseline) {
          filtered.forEach((report) => {
            if (nextStatuses[report.id] && nextStatuses[report.id] !== report.status) {
              notifyStatusChange(report);
            }
            nextStatuses[report.id] = report.status || 'Received';
          });
        } else {
          filtered.forEach((report) => {
            nextStatuses[report.id] = report.status || 'Received';
          });
        }
        await AsyncStorage.setItem(REPORT_STATUS_KEY, JSON.stringify(nextStatuses));
        if (!active) return;
        setReports(filtered);
      } catch (error) {
        console.log('Reports load error:', error);
      }
    };

    loadReports();
    pollTimer = setInterval(loadReports, 30000);
    return () => {
      active = false;
      clearInterval(pollTimer);
    };
  }, [profile]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const configureNotifications = async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('status-updates', {
          name: 'Status updates',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    };

    configureNotifications().catch((error) => {
      console.log('Notification setup failed:', error.message || error);
    });
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!active) return;
      setLatitude(String(current.coords.latitude));
      setLongitude(String(current.coords.longitude));
    })();

    return () => {
      active = false;
    };
  }, []);

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to attach evidence.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;

    const newImages = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName || `incident-${Date.now()}.jpg`,
    }));

    setImages((current) => [...current, ...newImages]);
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') {
      setCameraOpen(true);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to take an evidence photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;

    const photo = result.assets[0];
    if (photo) {
      setImages((current) => [...current, {
        uri: photo.uri,
        name: photo.fileName || `incident-camera-${Date.now()}.jpg`,
      }]);
    }
  };

  const handleCameraCapture = (photo) => {
    setImages((current) => [...current, photo]);
    setCameraOpen(false);
  };

  const openPhotoViewer = (items, startIndex = 0) => {
    const validItems = (items || []).filter(Boolean);
    if (!validItems.length) return;
    setPhotoViewerItems(validItems);
    setPhotoViewerIndex(Math.min(startIndex, validItems.length - 1));
    setPhotoViewerVisible(true);
  };

  const closePhotoViewer = () => {
    setPhotoViewerVisible(false);
    setPhotoViewerIndex(0);
    setPhotoViewerItems([]);
  };

  const downloadQRCode = async () => {
    if (Platform.OS === 'web') {
      try {
        // For web, fetch the image and create a download
        const qrImagePath = require('./assets/qrRelieffund.png');
        const link = document.createElement('a');
        link.href = qrImagePath;
        link.download = 'disaster-relief-fund-qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download failed:', error);
      }
    } else {
      // For native mobile, save to device gallery
      try {
        // Request permissions and save (requires expo-media-library)
        Alert.alert(
          'Save QR Code',
          'Please take a screenshot to save the QR code.',
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Save failed:', error);
      }
    }
  };

  const photoViewerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -50 && photoViewerIndex < photoViewerItems.length - 1) {
            setPhotoViewerIndex((current) => Math.min(current + 1, photoViewerItems.length - 1));
          } else if (gesture.dx > 50 && photoViewerIndex > 0) {
            setPhotoViewerIndex((current) => Math.max(current - 1, 0));
          }
        },
      }),
    [photoViewerIndex, photoViewerItems.length],
  );

  const handleUseLiveLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Location permission needed', 'Allow location access to use Live GPS.');
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const nextLatitude = String(current.coords.latitude);
      const nextLongitude = String(current.coords.longitude);
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setProfileDirty(true);
      if (Platform.OS !== 'web') {
        const addresses = await Location.reverseGeocodeAsync(current.coords);
        const address = addresses[0];
        if (address) {
          const placeName = [address.name, address.street, address.city, address.region].filter(Boolean).join(', ');
          setLocationName(placeName);
          setLocation(placeName);
        }
      } else {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLatitude}&lon=${nextLongitude}`);
          const data = await response.json();
          const placeName = data.display_name || `${nextLatitude}, ${nextLongitude}`;
          setLocationName(placeName);
          setLocation(placeName);
        } catch {
          const coordinates = `${nextLatitude}, ${nextLongitude}`;
          setLocationName(coordinates);
          setLocation(coordinates);
        }
      }
    } catch (error) {
      Alert.alert('Location unavailable', error.message || 'Unable to read your current location.');
    }
  };

  const uploadEvidence = async (image) => {
    const formData = new FormData();
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (Platform.OS === 'web') {
      const imageData = await fetch(image.uri);
      const imageBlob = await imageData.blob();
      formData.append('file', imageBlob, image.name || `incident-${Date.now()}.jpg`);
    } else {
      formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg',
        name: image.name || `incident-${Date.now()}.jpg`,
      });
    }
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok || !result.secure_url) {
      throw new Error(result?.error?.message || 'Evidence upload failed.');
    }
    return { url: result.secure_url, name: image.name };
  };

  const updateEmergencyContact = (index, field, value) => {
    setEmergencyContacts((current) =>
      current.map((contact, contactIndex) => {
        if (contactIndex !== index) return contact;
        const nextValue = field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
        return { ...contact, [field]: nextValue };
      }),
    );
  };

  const saveEmergencyContacts = async () => {
    // Get email from profile or current state
    const cleanEmail = (profile?.email || email.trim()).toLowerCase();
    
    if (!cleanEmail) {
      Alert.alert('Profile required', 'Please enter your email in your profile before saving SOS contacts.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address in your profile.');
      return;
    }

    // Normalize the emergency contacts
    const normalizedEmergencyContacts = emergencyContacts.slice(0, visibleEmergencyContactCount).map((contact) => ({
      name: contact.name.trim(),
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone.replace(/\D/g, '').slice(0, 10),
    }));

    const invalidPhoneContact = normalizedEmergencyContacts.find((contact) => contact.phone.length !== 10);
    if (invalidPhoneContact) {
      Alert.alert('Invalid phone number', 'Each emergency contact must have exactly 10 digits.');
      return;
    }

    // Check if all visible emergency contacts are complete
    const incompleteEmergencyContact = normalizedEmergencyContacts.find(
      (contact) => !contact.name || !contact.email || !contact.phone,
    );

    if (incompleteEmergencyContact) {
      Alert.alert('SOS contact incomplete', 'Each visible emergency contact must include a name, email, and phone number.');
      return;
    }

    // Check for duplicate emails
    const emails = normalizedEmergencyContacts.map(c => c.email);
    const duplicateEmail = emails.find((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmail) {
      Alert.alert('Duplicate email', `The email "${duplicateEmail}" is used more than once. Each emergency contact must have a unique email address.`);
      return;
    }

    // Check for duplicate phone numbers
    const phones = normalizedEmergencyContacts.map(c => c.phone);
    const duplicatePhone = phones.find((phone, index) => phones.indexOf(phone) !== index);
    if (duplicatePhone) {
      Alert.alert('Duplicate phone', `The phone number "${duplicatePhone}" is used more than once. Each emergency contact must have a unique phone number.`);
      return;
    }

    // Prepare the profile data for update
    const nextProfile = {
      name: name.trim() || profile?.name || '',
      email: cleanEmail,
      phone: phone.replace(/\D/g, '').slice(0, 10) || profile?.phone || '',
      location: location.trim() || profile?.location || '',
      locationName: locationName.trim() || profile?.locationName || '',
      latitude: latitude || profile?.latitude || '',
      longitude: longitude || profile?.longitude || '',
      password: profile?.password || password || '',
      isEmailVerified: Boolean(profile?.isEmailVerified || isEmailVerified),
      emergencyContacts: normalizedEmergencyContacts,
      updatedAt: serverTimestamp(),
    };

    const nextEmergencyContacts = Array.from({ length: 3 }, (_, index) => ({
      name: normalizedEmergencyContacts[index]?.name || '',
      email: normalizedEmergencyContacts[index]?.email || '',
      phone: normalizedEmergencyContacts[index]?.phone || '',
    }));

    try {
      // Save to Firestore
      await setDoc(doc(db, 'userProfiles', cleanEmail), nextProfile, { merge: true });
      
      // Save to local storage
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      
      // Update state
      setEmergencyContacts(nextEmergencyContacts);
      setVisibleEmergencyContactCount(Math.min(Math.max(normalizedEmergencyContacts.length, 1), 3));
      setProfile(nextProfile);
      
      // Verify the save by reading back from Firestore
      try {
        const refreshedDoc = await getDoc(doc(db, 'userProfiles', cleanEmail));
        if (refreshedDoc.exists()) {
          const refreshedData = refreshedDoc.data();
          console.log('Emergency contacts saved to Firestore:', refreshedData.emergencyContacts);
          
          if (Array.isArray(refreshedData.emergencyContacts)) {
            const hydrated = Array.from({ length: 3 }, (_, index) => ({
              name: refreshedData.emergencyContacts[index]?.name || '',
              email: refreshedData.emergencyContacts[index]?.email || '',
              phone: refreshedData.emergencyContacts[index]?.phone || '',
            }));
            setEmergencyContacts(hydrated);
            setVisibleEmergencyContactCount(Math.min(Math.max(refreshedData.emergencyContacts.length, 1), 3));
          }
        }
      } catch (error) {
        console.log('SOS verification read skipped:', error.message || error);
      }
      
      // Minimize the section after successful save
      setSosExpanded(false);
      
      setBannerMessage('Emergency contacts saved successfully.');
      Alert.alert('SOS saved', 'Emergency contacts have been saved successfully.');
    } catch (error) {
      console.log('SOS save error:', error);
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        cleanEmail,
        hasPassword: Boolean(nextProfile.password),
        hasEmergencyContacts: nextProfile.emergencyContacts.length
      });
      
      const errorMessage = error.code === 'permission-denied'
        ? 'Firebase permission denied. Make sure Firestore rules are deployed and your profile has a valid email and password.'
        : error.message || 'Unable to save SOS contacts.';
      Alert.alert('Save failed', errorMessage);
    }
  };

  const saveProfile = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert('Profile incomplete', 'Please enter your email to save your profile.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    const profilePhone = phone.replace(/\D/g, '').slice(0, 10);
    if (profilePhone.length !== 10) {
      Alert.alert('Invalid phone number', 'Your phone number must contain exactly 10 digits.');
      return;
    }

    if (!password || !validatePassword(password)) {
      Alert.alert('Password required', 'Password must be at least 6 characters.');
      return;
    }

    if (!isEmailVerified) {
      Alert.alert('Email not verified', 'Please verify your email address before saving.');
      return;
    }

    const normalizedEmergencyContacts = emergencyContacts.slice(0, visibleEmergencyContactCount).map((contact) => ({
      name: contact.name.trim(),
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone.replace(/\D/g, '').slice(0, 10),
    }));

    const incompleteEmergencyContact = normalizedEmergencyContacts.find(
      (contact) => !contact.name || !contact.email || !contact.phone,
    );

    if (incompleteEmergencyContact) {
      Alert.alert('SOS contact incomplete', 'Each visible emergency contact must include a name, email, and phone number.');
      return;
    }

    setProfileLoading(true);

    try {
      const profileData = {
        name: name.trim(),
        email: cleanEmail,
        phone: profilePhone,
        location: location.trim(),
        locationName: locationName.trim(),
        latitude: latitude || '',
        longitude: longitude || '',
        password: password,
        isEmailVerified: true,
        emergencyContacts: normalizedEmergencyContacts,
        updatedAt: serverTimestamp(),
      };

      const nextEmergencyContacts = Array.from({ length: 3 }, (_, index) => ({
        name: normalizedEmergencyContacts[index]?.name || '',
        email: normalizedEmergencyContacts[index]?.email || '',
        phone: normalizedEmergencyContacts[index]?.phone || '',
      }));

      await setDoc(doc(db, 'userProfiles', cleanEmail), profileData, { merge: true });
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
      await AsyncStorage.setItem(REPORTER_ID_KEY, deriveReporterId(cleanEmail));
      setEmergencyContacts(nextEmergencyContacts);
      setVisibleEmergencyContactCount(Math.min(Math.max(normalizedEmergencyContacts.length, 1), 3));
      setProfile(profileData);
      setIdentified(false);
      setProfileDirty(false);

      const refreshedDoc = await getDoc(doc(db, 'userProfiles', cleanEmail));
      if (refreshedDoc.exists()) {
        const refreshedData = refreshedDoc.data();
        if (Array.isArray(refreshedData.emergencyContacts)) {
          const hydrated = Array.from({ length: 3 }, (_, index) => ({
            name: refreshedData.emergencyContacts[index]?.name || '',
            email: refreshedData.emergencyContacts[index]?.email || '',
            phone: refreshedData.emergencyContacts[index]?.phone || '',
          }));
          setEmergencyContacts(hydrated);
          setVisibleEmergencyContactCount(Math.min(Math.max(refreshedData.emergencyContacts.length, 1), 3));
        }
      }
      Alert.alert('Profile saved', 'Your details and SOS contacts are now saved and will be used for reports.');
    } catch (error) {
      Alert.alert('Profile save failed', error.message || 'Something went wrong.');
    } finally {
      setProfileLoading(false);
    }
  };

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!validateEmail(cleanEmail)) {
      setOtpError('Please enter a valid email address.');
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setSendingOtp(true);
    setOtpError('');

    try {
      const newOtp = generateOTP();
      setGeneratedOtp(newOtp);
      
      // In a real implementation, send OTP via email service
      // For now, we'll just show it in an alert for testing
      Alert.alert('OTP Sent', `Your verification code is: ${newOtp}\n\n(In production, this would be sent to your email)`);
      setOtpSent(true);
    } catch (error) {
      setOtpError('Failed to send OTP. Please try again.');
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      setIsEmailVerified(true);
      setProfileDirty(true);
      setOtpSent(false);
      setOtp('');
      setGeneratedOtp('');
      setOtpError('');
      Alert.alert('Success', 'Email verified successfully!');
    } else {
      setOtpError('Invalid OTP. Please try again.');
      Alert.alert('Invalid OTP', 'The code you entered is incorrect. Please try again.');
    }
  };

  const lookupRegisteredProfile = async () => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!validateEmail(cleanEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      const docSnap = await getDocs(collection(db, 'userProfiles'));
      const profileDoc = docSnap.docs.find(d => d.id === cleanEmail);
      
      if (!profileDoc) {
        Alert.alert('Not registered', 'This email is not registered yet. Please fill the profile manually.');
        setAlreadyRegistered(false);
        return;
      }

      // Keep the email as entered by user, just lock the field
      setEmail(cleanEmail);
      setAlreadyRegistered(true);
      Alert.alert('Email found', 'Please enter your password to load your profile.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to check registration.');
    }
  };

  const loadRegisteredProfile = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      Alert.alert('Password required', 'Please enter your password.');
      return;
    }

    try {
      const docSnap = await getDocs(collection(db, 'userProfiles'));
      const profileDoc = docSnap.docs.find(d => d.id === cleanEmail);

      if (!profileDoc) {
        Alert.alert('Not found', 'This email is not registered yet.');
        return;
      }

      const stored = profileDoc.data();

      if (password !== stored.password) {
        Alert.alert('Incorrect password', 'The password you entered is incorrect.');
        return;
      }

      // Load all saved data
      setName(stored.name || '');
      setEmail(stored.email || '');
      setPhone(stored.phone || '');
      setLocation(stored.location || '');
      setLocationName(stored.locationName || stored.location || '');
      setLatitude(stored.latitude || '');
      setLongitude(stored.longitude || '');
      setPassword(stored.password || '');
      setIsEmailVerified(Boolean(stored.isEmailVerified));
      setAlreadyRegistered(false);
      setProfile(stored);
      setProfileDirty(false);

      if (Array.isArray(stored.emergencyContacts) && stored.emergencyContacts.length) {
        const savedContacts = Array.from({ length: 3 }, (_, index) => ({
          name: stored.emergencyContacts[index]?.name || '',
          email: stored.emergencyContacts[index]?.email || '',
          phone: stored.emergencyContacts[index]?.phone || '',
        }));
        setEmergencyContacts(savedContacts);
        setVisibleEmergencyContactCount(Math.min(Math.max(stored.emergencyContacts.length, 1), 3));
        // Collapse the section if contacts are already saved
        const hasValidContacts = stored.emergencyContacts.some(c => c.name && c.email && c.phone);
        setSosExpanded(!hasValidContacts);
      }
      
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(stored));
      await AsyncStorage.setItem(REPORTER_ID_KEY, deriveReporterId(cleanEmail));
      
      Alert.alert('Success', 'Your profile has been loaded successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load profile.');
    }
  };

  const resetForm = () => {
    setPriority('Normal');
    setTitle('');
    setDescription('');
    setLocation('');
    setLocationName('');
    setLatitude('');
    setLongitude('');
    setName('');
    setEmail('');
    setPhone('');
    setImages([]);
    setIdentified(false);
    if (categories[0]) setSelectedCategory(categories[0]);
  };

  const generateReportReference = () => {
    const year = new Date().getFullYear();
    const suffix = String(Date.now()).slice(-6).padStart(6, '0');
    return `CA-${year}-${suffix}`;
  };

  const sendAuthorityEmail = async (report, reference, category) => {
    const authorityEmail = category?.email?.trim();
    if (!authorityEmail) {
      return;
    }

    const evidenceLinks = (report.evidence || [])
      .map((item) => {
        const candidate = item?.url || item?.secure_url || item?.link || '';
        if (!candidate || typeof candidate !== 'string') return '';
        return candidate.startsWith('http') ? candidate : '';
      })
      .filter(Boolean)
      .slice(0, 3);

    const emailBody = [
      `New report received: ${reference}`,
      `Category: ${category?.name || 'Unassigned'}`,
      `Title: ${report.title}`,
      `Location: ${report.location || 'Not provided'}`,
      `Priority: ${report.priority || 'Normal'}`,
      `Reporter: ${report.name || 'Anonymous'}`,
      `Contact email: ${report.email || 'Not provided'}`,
      `Phone: ${report.phone || 'Not provided'}`,
      `Description: ${report.description || 'No details provided'}`,
      `Status: ${report.status}`,
      evidenceLinks.length
        ? `Evidence links:\n${evidenceLinks.join('\n')}`
        : 'Evidence links: No uploaded evidence',
      `View in system: ${Platform.OS === 'web' ? window.location.origin : 'CivicAlert mobile app'}`,
    ].join('\n\n');

    const templateParams = {
      to_email: authorityEmail,
      reply_to: report.email || 'noreply@civicalert.local',
      reference,
      category: category?.name || 'Unassigned',
      title: report.title,
      location: report.location || 'Not provided',
      priority: report.priority || 'Normal',
      reporter: report.name || 'Anonymous',
      contact_email: report.email || 'Not provided',
      phone: report.phone || 'Not provided',
      description: report.description || 'No details provided',
      status: report.status,
      maps_url: '',
      view_link: Platform.OS === 'web' ? window.location.origin : 'CivicAlert mobile app',
      image_links: evidenceLinks.length ? evidenceLinks.join('\n') : 'No uploaded evidence',
      evidence_count: String(evidenceLinks.length),
      message: emailBody,
    };

    const canUseEmailJs = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

    try {
      if (Platform.OS === 'web' && canUseEmailJs) {
        const emailjs = (await import('@emailjs/browser')).default;
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        return;
      }

      const mailtoUrl = `mailto:${authorityEmail}?subject=${encodeURIComponent(
        `New CivicAlert report: ${reference}`,
      )}&body=${encodeURIComponent(emailBody)}`;
      await Linking.openURL(mailtoUrl);
    } catch {
      const fallbackMailto = `mailto:${authorityEmail}?subject=${encodeURIComponent(
        `New CivicAlert report: ${reference}`,
      )}&body=${encodeURIComponent(emailBody)}`;
      if (Platform.OS !== 'web') {
        try {
          await Linking.openURL(fallbackMailto);
        } catch (error) {
          console.log('Authority email fallback failed:', error.message || error);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !title.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Please select a category, title, and description.');
      return;
    }

    setLoading(true);

    try {
      const activeEmail = (profile?.email || email.trim()).toLowerCase();
      const uploadedEvidence = [];
      for (const image of images.slice(0, 8)) {
        try {
          uploadedEvidence.push(await uploadEvidence(image));
        } catch (error) {
          console.log('Evidence upload skipped:', error.message);
        }
      }

      const reference = generateReportReference();
      const report = {
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        reference,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || 'Current location',
        locationName: locationName.trim() || location.trim() || 'Current location',
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        priority,
        name: identified ? (name.trim() || profile?.name || 'Anonymous') : profile?.name || 'Anonymous',
        email: activeEmail,
        phone: phone.replace(/\D/g, '').slice(0, 10),
        evidence: uploadedEvidence,
        reporterId: deriveReporterId(activeEmail || ''),
        status: 'Received',
        createdAt: serverTimestamp(),
      };

      const reportDocRef = await addDoc(collection(db, 'reports'), report);
      await sendAuthorityEmail({ ...report, reference }, reference, selectedCategory);

      if (activeEmail) {
        const nextProfile = {
          name: (name || profile?.name || '').trim(),
          email: activeEmail,
          phone: phone.replace(/\D/g, '').slice(0, 10),
          location: location.trim(),
          locationName: locationName.trim(),
          latitude: latitude || '',
          longitude: longitude || '',
        };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
        setProfile(nextProfile);
      }
      resetForm();
      setView('reports');
      const refreshed = await getDocs(collection(db, 'reports'));
      const nextReports = refreshed.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => String(item.email || '').trim().toLowerCase() === activeEmail || String(item.reporterId || '').trim() === deriveReporterId(activeEmail || ''))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReports(nextReports);
      Alert.alert('Report submitted', 'Your incident has been saved successfully.');
      console.log('Saved report id:', reportDocRef.id, 'reference:', reference);
    } catch (error) {
      Alert.alert('Submission failed', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const activeReports = useMemo(() => reports, [reports]);

  const renderReportForm = () => (
    <View style={styles.reportLayout}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>CIVIC RESPONSE NETWORK</Text>
        <Text style={styles.heroTitle}>Make your{`\n`}community{`\n`}safer, together.</Text>
        <Text style={styles.heroText}>Tell the right department what happened. Your report is routed directly to the people who can help.</Text>
        <Pressable style={styles.heroButton} onPress={() => setView('reports')}>
          <Text style={styles.heroButtonText}>My reports</Text>
        </Pressable>
      </View>

      <View style={styles.responseStatus}>
        <Text style={styles.statusDot}>•</Text>
        <View>
          <Text style={styles.responseTitle}>Response teams online</Text>
          <Text style={styles.responseText}>Reports are reviewed daily</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.stepLabel}>01 / 03</Text>
            <Text style={styles.panelTitle}>What happened?</Text>
          </View>
          <Text style={styles.shield}>Secure</Text>
        </View>

        <Text style={styles.label}>Issue category <Text style={styles.required}>Required</Text></Text>
        <View style={styles.dropdownWrap}>
          <Pressable style={styles.dropdownTrigger} onPress={() => setCategoryMenuOpen((current) => !current)}>
            <Text style={styles.dropdownText}>{selectedCategory ? selectedCategory.name : 'Select the department'}</Text>
            <Text style={styles.dropdownCaret}>{categoryMenuOpen ? '▴' : '▾'}</Text>
          </Pressable>

          {categoryMenuOpen && (
            <View style={styles.dropdownMenu}>
              {categories.map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.dropdownItem, selectedCategory?.id === option.id && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedCategory(option);
                    setCategoryMenuOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedCategory?.id === option.id && styles.dropdownItemTextActive]}>{option.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Short title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Give your report a clear title"
        />

        <Text style={styles.label}>Describe the issue</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add useful details: what happened, when, and who may be affected..."
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Location</Text>
        <View style={styles.locationInputRow}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            value={location}
            onChangeText={(value) => {
              setLocation(value);
              setLocationName(value);
            }}
            placeholder="Street, landmark or area"
          />
          <Pressable style={styles.gpsButton} onPress={handleUseLiveLocation}>
            <Text style={styles.gpsButtonText}>Live GPS</Text>
          </Pressable>
        </View>

        <MapPreview region={mapRegion} locationName={locationName || location} />

        <CameraCapture
          visible={cameraOpen}
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />

        <Text style={styles.label}>Urgency</Text>
        <View style={styles.priorityList}>
          {priorityOptions.map((option) => (
            <Pressable
              key={option}
              style={[styles.priorityChip, priority === option && styles.priorityChipActive]}
              onPress={() => setPriority(option)}
            >
              <Text style={[styles.priorityChipText, priority === option && styles.priorityChipTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Evidence</Text>
        <View style={styles.evidenceButtons}>
          <Pressable style={[styles.secondaryButton, styles.evidenceButton]} onPress={handleTakePhoto}>
            <Text style={styles.secondaryButtonText}>Take photo</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, styles.evidenceButton]} onPress={handlePickImages}>
            <Text style={styles.secondaryButtonText}>Add photos</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>Take photo opens your camera. Add photos selects existing images. Maximum 8.</Text>

        {images.length > 0 && (
          <View style={styles.gallery}>
            {images.map((image, index) => (
              <View key={`${image.name}-${index}`} style={styles.previewItem}>
                <Pressable onPress={() => openPhotoViewer(images.map((item) => item.uri), index)}>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.previewImage}
                />
                </Pressable>
                <Pressable
                  style={styles.removePreviewButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove evidence photo ${index + 1}`}
                >
                  <Text style={styles.removePreviewText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.identityBox}>
          <View style={styles.identityTextWrap}>
            <Text style={styles.identityTitle}>How should we contact you?</Text>
            <Text style={styles.identityNote}>Your identity is optional. Anonymous reports are still fully routed.</Text>
          </View>

          <Pressable style={styles.toggleWrap} onPress={() => setIdentified((current) => !current)}>
            <View style={[styles.toggle, identified && styles.toggleOn]}>
              <View style={[styles.toggleKnob, identified && styles.toggleKnobOn]} />
            </View>
            <Text style={styles.toggleLabel}>Identify me</Text>
          </Pressable>
        </View>

        {identified && (
          <View style={styles.identifiedFields}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
            />
          </View>
        )}

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit report'} →</Text>
        </Pressable>

        <Text style={styles.formFootnote}>By submitting, you agree that CivicAlert may use this information to coordinate a response.</Text>
      </View>

      <View style={styles.sideCard}>
        <View style={styles.routeCard}>
          <Text style={styles.routeIcon}>◎</Text>
          <Text style={styles.routeitem}>Smart routing</Text>
          <Text style={styles.routeTitle}>
            One report. <Text style={styles.routeTitleAccent}>Right department.</Text>
          </Text>
          <Text style={styles.routeText}>We match your category to its responsible authority and notify their team by email.</Text>

          <View style={styles.routeList}>
            <Text style={styles.routeItem}><Text style={styles.routeItemNumber}>01</Text> Choose a category</Text>
            <Text style={styles.routeItem}><Text style={styles.routeItemNumber}>02</Text> Add the location</Text>
            <Text style={styles.routeItem}><Text style={styles.routeItemNumber}>03</Text> We coordinate action</Text>
          </View>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyIcon}>✓</Text>
          <Text style={styles.privacyTitle}>Your privacy matters</Text>
          <Text style={styles.privacyText}>Choose anonymous reporting when you do not want to share your identity.</Text>
        </View>

        <View style={styles.sosCard}>
          <Pressable 
            style={styles.sosHeader}
            onPress={() => setSosExpanded(!sosExpanded)}
          >
            <View style={styles.sosHeaderLeft}>
              <Text style={styles.sosTitle}>Emergency SOS contacts</Text>
              {!sosExpanded && emergencyContacts.some(c => c.name && c.email && c.phone) && (
                <Text style={styles.sosSummary}>
                  {emergencyContacts.filter(c => c.name && c.email && c.phone).length} contact{emergencyContacts.filter(c => c.name && c.email && c.phone).length > 1 ? 's' : ''} saved
                </Text>
              )}
            </View>
            <Text style={styles.sosToggleIcon}>{sosExpanded ? '▴' : '▾'}</Text>
          </Pressable>

          {sosExpanded && (
            <>
              <Text style={styles.sosHelperText}>
                {(profile?.email || email) 
                  ? 'Add up to 3 emergency contacts. Each contact must have a unique email and phone number.'
                  : 'Please save your profile first or enter your email in "My Profile" to save emergency contacts.'}
              </Text>
              {emergencyContacts.slice(0, visibleEmergencyContactCount).map((contact, index) => (
                <View key={`sos-${index}`} style={styles.sosContactCard}>
                  <Text style={styles.sosContactLabel}>Contact {index + 1}</Text>
                  <TextInput
                    style={styles.sosInput}
                    value={contact.name}
                    onChangeText={(value) => updateEmergencyContact(index, 'name', value)}
                    placeholder="Full name"
                  />
                  <TextInput
                    style={styles.sosInput}
                    value={contact.email}
                    onChangeText={(value) => updateEmergencyContact(index, 'email', value)}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.sosInput}
                    value={contact.phone}
                    onChangeText={(value) => updateEmergencyContact(index, 'phone', value)}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              ))}

              {visibleEmergencyContactCount < 3 && (
                <Pressable
                  style={styles.addContactButton}
                  onPress={() => setVisibleEmergencyContactCount((current) => Math.min(current + 1, 3))}
                >
                  <Text style={styles.addContactButtonText}>+ Add another contact</Text>
                </Pressable>
              )}

              <Pressable style={styles.saveSOSButton} onPress={saveEmergencyContacts}>
                <Text style={styles.saveSOSButtonText}>Save emergency contacts</Text>
              </Pressable>
            </>
          )}
          
          {!sosExpanded && (
            <View style={styles.sosCollapsedContent}>
              {emergencyContacts.filter(c => c.name && c.email && c.phone).length > 0 ? (
                emergencyContacts.filter(c => c.name && c.email && c.phone).map((contact, index) => (
                  <View key={`mini-${index}`} style={styles.sosMiniContact}>
                    <Text style={styles.sosMiniName}>{contact.name}</Text>
                    <Text style={styles.sosMiniDetails}>{contact.email} • {contact.phone}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.sosEmptyText}>No emergency contacts saved yet</Text>
              )}
              <Pressable 
                style={styles.sosEditButton}
                onPress={() => setSosExpanded(true)}
              >
                <Text style={styles.sosEditButtonText}>Edit contacts</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderReports = () => (
    <View style={styles.screenBlock}>
      <View style={styles.reportsHeader}>
        <View>
          <Text style={styles.myReportsTitle}>My reports</Text>
        </View>
        <Pressable style={styles.newReportButton} onPress={() => setView('report')}>
          <Text style={styles.newReportButtonText}>+ New report</Text>
        </Pressable>
      </View>

      {activeReports.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptyText}>Submit an incident and it will appear here with status updates.</Text>
        </View>
      ) : (
        activeReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportCardTitle}>{report.title || 'Untitled report'}</Text>
              <View style={[styles.reportStatusBadge, { backgroundColor: statusColor(report.status) }]}>
                <Text style={[styles.reportStatusText, { color: statusText(report.status) }]}>
                  {report.status || 'Received'}
                </Text>
              </View>
            </View>

            <Text style={styles.reportCategory}>{report.category || 'General'}</Text>
            <Text style={styles.reportDateText}>{formatReportTimestamp(report.createdAt)}</Text>
            <Text style={styles.reportLocationText}>{report.locationName || report.location || 'Location not provided'}</Text>
            
            <Text style={styles.reportDescriptionText}>{report.description || 'No description provided.'}</Text>

            {report.evidence?.length > 0 && (
              <View style={styles.evidenceSection}>
                <Text style={styles.evidenceLabel}>{report.evidence.length} photo{report.evidence.length > 1 ? 's' : ''}</Text>
                <View style={styles.evidenceGallery}>
                  {report.evidence.slice(0, 3).map((photo, index) => (
                    <Pressable
                      key={`${photo.url || photo.name || index}-${index}`}
                      onPress={() => openPhotoViewer(report.evidence.map((item) => item.url || item.uri).filter(Boolean), index)}
                    >
                      <Image
                        source={{ uri: photo.url || photo.uri }}
                        style={styles.evidenceImage}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.timelineSection}>
              <Text style={styles.timelineTitle}>TIMELINE</Text>
              {(Array.isArray(report.timeline) && report.timeline.length
                ? report.timeline
                : [{ label: 'Report submitted', status: report.status || 'Received', note: 'Report received in the system' }]
              ).slice(-5).map((event, index) => (
                <View key={`${report.id}-timeline-${index}`} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineEventLabel}>{event.label || event.status || 'Status update'}</Text>
                    <Text style={styles.timelineEventNote}>{event.note || ''}</Text>
                    {event.timestamp ? <Text style={styles.timelineEventDate}>{formatReportTimestamp(event.timestamp)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.reportActions}>
              <Pressable 
                style={styles.mapLinkButton}
                onPress={() => {
                  const lat = report.latitude || 0;
                  const lon = report.longitude || 0;
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                  Linking.openURL(mapUrl);
                }}
              >
                <Text style={styles.mapLinkText}>View on map →</Text>
              </Pressable>
              
              <Text style={styles.reportReferenceText}>{report.reference || report.id}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderProfile = () => (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileTitle}>My Profile</Text>
        <Pressable style={styles.closeButton} onPress={() => setView('report')}>
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.profileSubtitle}>Your details will auto-fill in reports.</Text>

      <ScrollView style={styles.profileScrollView}>
        <Text style={styles.profileSectionTitle}>Personal Information</Text>
        
        {!alreadyRegistered && (
          <>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.profileInput}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setProfileDirty(true);
              }}
              placeholder="Your full name"
            />
          </>
        )}

        <Text style={styles.fieldLabel}>Email {isEmailVerified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}</Text>
        <TextInput
          style={[styles.profileInput, (isEmailVerified || alreadyRegistered) && styles.inputVerified]}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setProfileDirty(true);
          }}
          placeholder="admin.gov@incidentreport.com"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isEmailVerified && !alreadyRegistered}
        />

        {!isEmailVerified && !alreadyRegistered && (
          <View style={styles.verificationSection}>
            <Pressable 
              style={styles.verificationButton}
              onPress={lookupRegisteredProfile}
            >
              <Text style={styles.verificationButtonText}>Already registered</Text>
            </Pressable>

            <Pressable 
              style={[styles.verificationButton, (sendingOtp || !email) && styles.buttonDisabled]} 
              onPress={sendOtp}
              disabled={sendingOtp || !email}
            >
              <Text style={styles.verificationButtonText}>{sendingOtp ? 'Sending...' : 'Send OTP'}</Text>
            </Pressable>

            {otpSent && (
              <>
                <TextInput
                  style={styles.otpInputField}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable style={styles.verifyButton} onPress={verifyOtp}>
                  <Text style={styles.verifyButtonText}>Verify</Text>
                </Pressable>
              </>
            )}

            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
          </View>
        )}

        <Text style={styles.fieldLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.profileInput, styles.passwordField, isEmailVerified && styles.inputVerified]}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setProfileDirty(true);
            }}
            placeholder={alreadyRegistered ? "Enter your password" : "Create a password (min 6 characters)"}
            secureTextEntry={!showPassword}
            editable={!isEmailVerified}
          />
          <Pressable 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>

        {alreadyRegistered && (
          <Pressable 
            style={[styles.loadProfileButton, !password && styles.buttonDisabled]} 
            onPress={loadRegisteredProfile}
            disabled={!password}
          >
            <Text style={styles.loadProfileButtonText}>Load Profile</Text>
          </Pressable>
        )}

        {!alreadyRegistered && (
          <>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.profileInput}
              value={phone}
              onChangeText={(value) => {
                setPhone(value.replace(/\D/g, '').slice(0, 10));
                setProfileDirty(true);
              }}
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.locationFieldWrap}>
              <TextInput
                style={[styles.profileInput, styles.locationFieldInput]}
                value={location}
                onChangeText={(value) => {
                  setLocation(value);
                  setLocationName(value);
                  setProfileDirty(true);
                }}
                placeholder="Street, landmark or area"
              />
              <Pressable style={styles.liveGpsButton} onPress={handleUseLiveLocation}>
                <Text style={styles.liveGpsButtonText}>Live GPS</Text>
              </Pressable>
            </View>

            <View style={styles.profileActions}>
              <Pressable style={styles.profileCancelButton} onPress={() => setView('report')}>
                <Text style={styles.profileCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable 
                style={[styles.profileSaveButton, profileDirty && styles.profileSaveButtonActive, (!profileDirty || profileLoading) && styles.buttonDisabled]} 
                onPress={saveProfile} 
                disabled={!profileDirty || profileLoading}
              >
                <Text style={styles.profileSaveButtonText}>{profileLoading ? 'Saving...' : 'Save Profile'}</Text>
              </Pressable>
            </View>
          </>
        )}

        {alreadyRegistered && (
          <View style={styles.profileActions}>
            <Pressable 
              style={styles.profileCancelButton} 
              onPress={() => {
                setAlreadyRegistered(false);
                setPassword('');
                // Keep the email as it was
              }}
            >
              <Text style={styles.profileCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        transparent
        visible={donationDialogVisible}
        animationType="fade"
        onRequestClose={() => {}} // Prevent closing by back button
      >
        <View style={styles.donationOverlay}>
          <View style={styles.donationDialog}>
            <Pressable 
              style={styles.donationCloseButton}
              onPress={() => setDonationDialogVisible(false)}
            >
              <Text style={styles.donationCloseText}>×</Text>
            </Pressable>

            <Text style={styles.donationTitle}>Donate for the needy</Text>
            <Text style={styles.donationSubtitle}>
              Support the relief fund by scanning or downloading this QR code.
            </Text>

            <Pressable onPress={downloadQRCode} style={styles.qrCodeWrapper}>
              <Image
                source={require('./assets/qrRelieffund.png')}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </Pressable>

            <View style={styles.donationFooter}>
              <Text style={styles.donationClickHint}>Click on the QR image to download</Text>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={photoViewerVisible}
        animationType="fade"
        onRequestClose={closePhotoViewer}
      >
        <View style={styles.photoViewerOverlay}>
          <View style={styles.photoViewerContainer} {...photoViewerPanResponder.panHandlers}>
            <Pressable style={styles.photoViewerCloseButton} onPress={closePhotoViewer}>
              <Text style={styles.photoViewerCloseText}>×</Text>
            </Pressable>

            <Text style={styles.photoViewerCount}>
              {photoViewerIndex + 1} / {photoViewerItems.length || 1}
            </Text>

            {photoViewerItems[photoViewerIndex] ? (
              <Image
                source={{ uri: photoViewerItems[photoViewerIndex] }}
                style={styles.photoViewerImage}
                resizeMode="contain"
              />
            ) : null}

            <View style={styles.photoViewerFooter}>
              <Text style={styles.photoViewerHint}>Swipe left or right to change photos</Text>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.brandWrap} onPress={() => setView('report')}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>+</Text></View>
            <Text style={styles.brandText}>Civic<Text style={styles.brandAccent}>Alert</Text></Text>
          </Pressable>

          <View style={styles.navWrap}>
            <Pressable style={styles.profileButton} onPress={() => setView('profile')}>
              <Text style={styles.profileIcon}>👤</Text>
              <Text style={styles.profileButtonText}>My Profile</Text>
            </Pressable>
          </View>
        </View>

        {bannerMessage ? (
          <View style={styles.successBanner} accessibilityRole="alert">
            <Text style={styles.successBannerText}>{bannerMessage}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.container}>
          {view === 'report' ? renderReportForm() : view === 'reports' ? renderReports() : renderProfile()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f9fb' },
  wrapper: { flex: 1, backgroundColor: '#f7f9fb' },
  donationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 54, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  donationDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  donationCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  donationCloseText: {
    color: '#6b7280',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '400',
  },
  donationTitle: {
    color: '#0c4a6e',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  donationSubtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  qrCodeWrapper: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  qrCodeImage: {
    width: 300,
    height: 300,
  },
  donationFooter: {
    alignItems: 'center',
    width: '100%',
  },
  donationFundName: {
    color: '#0c4a6e',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  donationAccountInfo: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  donationClickHint: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  topBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 2,
    borderTopColor: '#222222',
    borderBottomWidth: 2,
    borderBottomColor: '#ea123b',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successBanner: {
    backgroundColor: '#eaf7ef',
    borderBottomWidth: 1,
    borderBottomColor: '#b9e4c7',
    paddingHorizontal: 18,
    paddingVertical: 11,
    alignItems: 'center',
  },
  successBannerText: {
    color: '#168556',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center' },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ea123b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandMarkText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  brandText: { color: '#073b82', fontSize: 19, fontWeight: '800' },
  brandAccent: { color: '#073b82' },
  navWrap: { flexDirection: 'row', alignItems: 'center' },
  profileButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#073b82', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  profileIcon: { color: '#402080', fontSize: 15, marginRight: 8 },
  profileButtonText: { color: '#073b82', fontSize: 12, fontWeight: '700' },
  container: { padding: 18, paddingBottom: 40 },
  reportLayout: { gap: 18 },
  hero: { paddingTop: 16 },
  heroEyebrow: { color: '#073b82', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  heroTitle: { color: '#073b82', fontSize: 34, lineHeight: 36, fontWeight: '900', marginBottom: 14 },
  heroText: { color: '#526a87', fontSize: 15, lineHeight: 23, marginBottom: 2 },
  heroButton: { backgroundColor: '#2378bd', paddingVertical: 14, paddingHorizontal: 18 },
  heroButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  responseStatus: { borderLeftWidth: 2, borderLeftColor: '#62d7b2', paddingVertical: 8, paddingLeft: 14, flexDirection: 'row', alignItems: 'flex-start' },
  statusDot: { color: '#1b9b76', fontSize: 24, lineHeight: 15, marginRight: 8 },
  responseTitle: { color: '#16856b', fontWeight: '800', fontSize: 13 },
  responseText: { color: '#607695', fontSize: 11, marginTop: 5 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#d8e0e9',
    padding: 18,
    shadowColor: '#12355b',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepLabel: {
    color: '#5c7ca6',
    fontWeight: '800',
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  panelTitle: { color: '#073b82', fontSize: 24, fontWeight: '800' },
  shield: {
    backgroundColor: '#eaf7ef',
    color: '#168556',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  label: {
    color: '#073b82',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  required: { color: '#d64d4d', fontWeight: '700' },
  dropdownWrap: { marginBottom: 10 },
  dropdownTrigger: {
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dfe7f3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: { color: '#12355b', fontSize: 15, fontWeight: '600' },
  dropdownCaret: { color: '#12355b', fontSize: 18, fontWeight: '800' },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7f3',
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 6,
    shadowColor: '#12355b',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: '#eaf1ff' },
  dropdownItemText: { color: '#12355b', fontSize: 14, fontWeight: '600' },
  dropdownItemTextActive: { color: '#12355b', fontWeight: '800' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe7f3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#12355b',
    marginBottom: 10,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  locationInputRow: { position: 'relative' },
  locationInput: { width: '100%', paddingRight: 92 },
  gpsButton: { position: 'absolute', right: 5, top: 5, borderWidth: 1, borderColor: '#073b82', borderRadius: 6, paddingHorizontal: 10, justifyContent: 'center', height: 38, backgroundColor: '#ffffff' },
  gpsButtonText: { color: '#073b82', fontSize: 11, fontWeight: '800' },
  map: { height: 170, borderRadius: 6, marginBottom: 4 },
  formRow: { flexDirection: 'row', gap: 12 },
  halfWrap: { flex: 1 },
  halfInput: { flex: 1 },
  priorityList: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  priorityChip: {
    backgroundColor: '#f3f7ff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dfe8f5',
  },
  priorityChipActive: { backgroundColor: '#12355b', borderColor: '#12355b' },
  priorityChipText: { color: '#2d4d72', fontSize: 11, fontWeight: '700' },
  priorityChipTextActive: { color: '#ffffff' },
  secondaryButton: {
    backgroundColor: '#edf4ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccdffb',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  secondaryButtonText: { color: '#12355b', fontWeight: '700' },
  evidenceButtons: { flexDirection: 'row', gap: 8 },
  evidenceButton: { flex: 1 },
  helperText: { color: '#607695', fontSize: 11, lineHeight: 18, marginBottom: 12 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  previewItem: { position: 'relative' },
  previewImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#dfe7f3' },
  removePreviewButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePreviewText: { color: '#ffffff', fontSize: 18, lineHeight: 18, fontWeight: '700' },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 54, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoViewerContainer: {
    width: '100%',
    maxWidth: 420,
    height: '72%',
    backgroundColor: '#101b2b',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  photoViewerCloseText: { color: '#ffffff', fontSize: 28, lineHeight: 28, fontWeight: '300' },
  photoViewerCount: {
    position: 'absolute',
    top: 18,
    left: 18,
    zIndex: 2,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  photoViewerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
  },
  photoViewerHint: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  identityBox: {
    backgroundColor: '#f5f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfe8f5',
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  identityTextWrap: { flex: 1 },
  identityTitle: { color: '#12355b', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  identityNote: { color: '#5d7391', fontSize: 11, lineHeight: 16 },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#dfe8f5',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#16a34a' },
  toggleKnob: { width: 14, height: 14, borderRadius: 999, backgroundColor: '#ffffff', marginLeft: 2 },
  toggleKnobOn: { marginLeft: 18 },
  toggleLabel: { color: '#12355b', fontWeight: '700', fontSize: 12 },
  identifiedFields: { marginBottom: 8 },
  submitButton: {
    backgroundColor: '#ea123b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  formFootnote: {
    color: '#627b99',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  sideCard: { gap: 14 },
  routeCard: { backgroundColor: '#12355b', borderRadius: 20, padding: 18 },
  routeIcon: { color: '#f4b942', fontSize: 28, marginBottom: 10, fontWeight: '800' },
  routeTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 10 },
  routeTitleAccent: { color: '#f4b942', fontWeight: '800' },
  routeText: { color: '#dfeaff', fontSize: 13, lineHeight: 20 },
  routeList: { marginTop: 16, gap: 10 },
  routeItem: { color: '#dfeaff', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  routeItemNumber: { color: '#f4b942', fontWeight: '800' },
  privacyCard: {
    backgroundColor: '#edfef2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d2f0d9',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  privacyIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#d7f4df',
    color: '#168556',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 26,
  },
  privacyTitle: { color: '#12355b', fontWeight: '800', fontSize: 13, marginBottom: 3 },
  privacyText: { color: '#4d6983', fontSize: 12, lineHeight: 18 },
  sosCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe8f5',
    padding: 16,
    gap: 12,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sosHeaderLeft: {
    flex: 1,
  },
  sosTitle: {
    color: '#073b82',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  sosSummary: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sosToggleIcon: {
    color: '#073b82',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  sosHelperText: {
    color: '#5d7391',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  sosContactCard: {
    backgroundColor: '#f7f9fb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3edf7',
    padding: 12,
    gap: 8,
  },
  sosContactLabel: {
    color: '#2378bd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sosInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe8f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#12355b',
  },
  sosCollapsedContent: {
    gap: 10,
    marginTop: 4,
  },
  sosMiniContact: {
    backgroundColor: '#f7f9fb',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
  },
  sosMiniName: {
    color: '#073b82',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  sosMiniDetails: {
    color: '#5d7391',
    fontSize: 11,
    lineHeight: 16,
  },
  sosEmptyText: {
    color: '#8a9db5',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sosEditButton: {
    backgroundColor: '#edf4ff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  sosEditButtonText: {
    color: '#2378bd',
    fontSize: 13,
    fontWeight: '700',
  },
  addContactButton: {
    backgroundColor: '#edf4ff',
    borderWidth: 1,
    borderColor: '#cfe0ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactButtonText: {
    color: '#2378bd',
    fontSize: 14,
    fontWeight: '800',
  },
  saveSOSButton: {
    backgroundColor: '#2378bd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSOSButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  screenBlock: { 
    paddingVertical: 18,
    paddingHorizontal: 0,
    backgroundColor: '#f7f9fb',
    flex: 1,
  },
  reportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  myReportsTitle: {
    color: '#073b82',
    fontSize: 32,
    fontWeight: '900',
  },
  newReportButton: {
    backgroundColor: '#2378bd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#2378bd',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  newReportButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#12355b',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  reportCardTitle: {
    flex: 1,
    color: '#073b82',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  reportStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reportStatusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportCategory: {
    color: '#2378bd',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  reportDateText: {
    color: '#8a9db5',
    fontSize: 12,
    marginBottom: 8,
  },
  reportLocationText: {
    color: '#5d7391',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  reportDescriptionText: {
    color: '#35557d',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  evidenceSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  evidenceLabel: {
    color: '#5d7391',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  evidenceGallery: {
    flexDirection: 'row',
    gap: 8,
  },
  evidenceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e8f0f8',
  },
  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8f0f8',
  },
  mapLinkButton: {
    paddingVertical: 6,
  },
  mapLinkText: {
    color: '#2378bd',
    fontSize: 13,
    fontWeight: '700',
  },
  reportReferenceText: {
    color: '#8a9db5',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sectionHeading: { 
    color: '#073b82', 
    fontSize: 32, 
    fontWeight: '900', 
    marginBottom: 8,
    lineHeight: 38,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#12355b',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: { 
    color: '#073b82', 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: { 
    color: '#607695', 
    fontSize: 15, 
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  reportListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#12355b',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  reportHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reportTitle: { flex: 1, color: '#12355b', fontSize: 18, fontWeight: '800' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  reportMeta: { color: '#48607d', fontSize: 12, marginTop: 8 },
  reportDescription: { color: '#35557d', fontSize: 13, lineHeight: 20, marginTop: 8 },
  reportReference: { marginTop: 10, color: '#12355b', fontSize: 12, fontWeight: '700' },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#12355b',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  profileContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0f8',
  },
  profileTitle: {
    color: '#073b82',
    fontSize: 24,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#607695',
    fontSize: 32,
    fontWeight: '300',
  },
  profileSubtitle: {
    color: '#607695',
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSectionTitle: {
    color: '#073b82',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#073b82',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  profileInput: {
    backgroundColor: '#f7f9fb',
    borderWidth: 1,
    borderColor: '#dfe8f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#073b82',
  },
  inputVerified: {
    backgroundColor: '#e8f4ff',
    color: '#2378bd',
  },
  verifiedBadge: {
    color: '#168556',
    fontSize: 11,
    fontWeight: '800',
  },
  verificationSection: {
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  verificationButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2378bd',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verificationButtonText: {
    color: '#2378bd',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  otpInputField: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c1d2e8',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
  },
  verifyButton: {
    backgroundColor: '#2378bd',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#ea123b',
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordField: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 4,
  },
  showHideText: {
    fontSize: 14,
    color: '#2378bd',
    fontWeight: '700',
  },
  locationFieldWrap: {
    position: 'relative',
  },
  locationFieldInput: {
    width: '100%',
    paddingRight: 104,
  },
  liveGpsButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2378bd',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  liveGpsButtonText: {
    color: '#2378bd',
    fontSize: 14,
    fontWeight: '700',
  },
  profileActions: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  profileCancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#c1d2e8',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  profileCancelButtonText: {
    color: '#2378bd',
    fontSize: 16,
    fontWeight: '700',
  },
  profileSaveButton: {
    backgroundColor: '#526a87',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  profileSaveButtonActive: {
    backgroundColor: '#ea123b',
  },
  profileSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  loadProfileButton: {
    backgroundColor: '#2378bd',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  loadProfileButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 10,
  },
  reportsHeaderLeft: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  sessionLabel: {
    color: '#2378bd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  myReportsTitle: {
    color: '#073b82',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
    letterSpacing: -1,
    flexShrink: 1,
  },
  newReportButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2378bd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 6,
    shadowColor: '#2378bd',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexShrink: 0,
  },
  newReportButtonText: {
    color: '#2378bd',
    fontSize: 13,
    fontWeight: '800',
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3edf7',
    padding: 18,
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 16,
    shadowColor: '#0d2243',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportCardTitle: {
    color: '#073b82',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    lineHeight: 24,
  },
  reportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportCategory: {
    color: '#5c7ca6',
    fontSize: 14,
    fontWeight: '600',
  },
  reportMetaSeparator: {
    color: '#c1d2e8',
    fontSize: 14,
    marginHorizontal: 6,
  },
  reportDateText: {
    color: '#7087a6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reportLocationText: {
    color: '#1a4d8a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
  },
  reportDescriptionText: {
    color: '#234c82',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  mapLinkButton: {
    marginBottom: 14,
  },
  mapLinkText: {
    color: '#2378bd',
    fontSize: 14,
    fontWeight: '700',
  },
  evidenceSection: {
    marginBottom: 14,
  },
  evidenceLabel: {
    color: '#5c7ca6',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  evidenceGallery: {
    flexDirection: 'row',
    gap: 10,
  },
  evidenceImage: {
    width: 92,
    height: 92,
    borderRadius: 10,
    backgroundColor: '#eef3f8',
  },
  timelineSection: {
    borderTopWidth: 1,
    borderTopColor: '#e3edf7',
    paddingTop: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  timelineTitle: {
    color: '#073b82',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e31846',
    marginTop: 4,
    marginRight: 14,
  },
  timelineContent: {
    flex: 1,
  },
  timelineEventLabel: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  timelineEventNote: {
    color: '#526a87',
    fontSize: 13,
    lineHeight: 18,
  },
  timelineEventDate: {
    color: '#8798ad',
    fontSize: 11,
    marginTop: 3,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  reportStatusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  reportStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportReferenceText: {
    color: '#7087a6',
    fontSize: 13,
    fontWeight: '600',
  },
});
