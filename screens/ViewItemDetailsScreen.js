import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

const ViewItemDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A154B" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Item Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.itemImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Item Information */}
        <View style={styles.section}>
          <View style={styles.itemHeader}>
            <Icon name="cube-outline" size={24} color="#4A154B" />
            <Text style={styles.itemTitle}>{item.title}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Found at: {item.location}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Date: {item.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="pricetag-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Category: {item.category}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Description: {item.description}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="call-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Contact: {item.contactInfo}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color="#666" />
              <Text style={styles.detailText}>Status: Unclaimed</Text>
            </View>
          </View>
        </View>

        {/* Donation Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Donation Information</Text>
          <View style={styles.donationInfo}>
            <Icon name="information-circle" size={24} color="#4A154B" />
            <Text style={styles.donationText}>
              This item has been unclaimed for 45 days and is now eligible for donation to a charitable organization.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A154B',
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#eee',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  section: {
    padding: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  donationInfo: {
    flexDirection: 'row',
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  donationText: {
    fontSize: 14,
    color: '#4A154B',
    marginLeft: 12,
    flex: 1,
  },
});

export default ViewItemDetailsScreen; 