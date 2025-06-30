import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    lostItems: 3,
    foundItems: 2,
    matches: 1,
    returnedItems: 1
  });

  const [donationItems, setDonationItems] = useState([
    {
      id: '1',
      title: 'Black Backpack',
      date: '2024-03-15',
      location: 'University Library',
      status: 'unclaimed',
      description: 'Found a black backpack with laptop compartment',
      category: 'Electronics',
      images: ['backpack_image_url'],
      contactInfo: 'Contact via app'
    },
    {
      id: '2',
      title: 'iPhone 13',
      date: '2024-03-10',
      location: 'Coffee Shop',
      status: 'unclaimed',
      description: 'Found an iPhone 13 with black case',
      category: 'Electronics',
      images: ['iphone_image_url'],
      contactInfo: 'Contact via app'
    }
  ]);

  const organizations = [
    {
      id: '1',
      name: 'Alkhidmat Foundation – Islamabad Branch',
      phone: '+92 51 2611911',
      mobile: '+92 300 8591619',
      email: 'info@alkhidmatisb.org',
      website: 'alkhidmatisb.org',
      address: 'Flat #4, First Floor, Khyber Plaza, Fazal-e-Haq Road, Blue Area, Islamabad',
      color: '#0000FF' // Blue
    },
    {
      id: '2',
      name: 'Edhi Foundation – Islamabad Centers',
      phone: '+92 51 2827844',
      address: 'Near Masjid-e-Shohada, Aabpara, G-6/1, Islamabad',
      website: 'edhi.org',
      color: '#FF0000', // Red
      subLocations: [
        {
          name: 'Edhi Centre H-8',
          address: 'Adjacent to CDA Office I, H-8/1, Islamabad',
          phone: '+92 51 4939267'
        }
      ]
    },
    {
      id: '3',
      name: 'JDC Foundation',
      phone: '(021) 36341059',
      email: 'info@jdcwelfare.org',
      website: 'jdcwelfare.org',
      address: 'B-24, Federal B Area, Ancholi Block 20, Gulberg Town, Karachi',
      note: 'Note: No physical office in Islamabad. Contact main office in Karachi.',
      color: '#FFD700' // Yellow
    }
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderStatCard = (title, count, icon, color, onPress) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: color }]} 
      onPress={onPress}
    >
      <View style={styles.statIconContainer}>
        <Icon name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const renderDonationItem = (item) => (
    <View style={styles.donationItemCard}>
      <View style={styles.donationItemHeader}>
        <Icon name="cube-outline" size={20} color="#4A154B" />
        <Text style={styles.donationItemTitle}>{item.title}</Text>
      </View>
      <View style={styles.donationItemDetails}>
        <Text style={styles.donationItemLocation}>Found at: {item.location}</Text>
        <Text style={styles.donationItemDate}>Date: {item.date}</Text>
      </View>
      <TouchableOpacity 
        style={styles.donationItemButton}
        onPress={() => navigation.navigate('ItemDetails', { 
          itemId: item._id || item.id,
          itemType: 'found',
          item: {
            ...item,
            itemName: item.title,
            contactInfo: {
              phone: item.contactInfo || 'Contact via app',
              email: item.email
            }
          }
        })}
      >
        <Text style={styles.donationItemButtonText}>View Details</Text>
        <Icon name="chevron-forward" size={20} color="#4A154B" />
      </TouchableOpacity>
    </View>
  );

  const renderOrganization = (org) => (
    <View key={org.id} style={[styles.organizationCard, { borderLeftColor: org.color, borderLeftWidth: 4 }]}>
      <Text style={styles.organizationName}>{org.name}</Text>
      
      <View style={styles.organizationDetails}>
        <Icon name="location-outline" size={20} color="#666" />
        <Text style={styles.organizationAddress}>{org.address}</Text>
      </View>

      <View style={styles.organizationDetails}>
        <Icon name="call-outline" size={20} color="#666" />
        <Text style={styles.organizationPhone}>{org.phone}</Text>
      </View>

      {org.mobile && (
        <View style={styles.organizationDetails}>
          <Icon name="phone-portrait-outline" size={20} color="#666" />
          <Text style={styles.organizationPhone}>{org.mobile}</Text>
        </View>
      )}

      {org.email && (
        <View style={styles.organizationDetails}>
          <Icon name="mail-outline" size={20} color="#666" />
          <Text style={styles.organizationEmail}>{org.email}</Text>
        </View>
      )}

      {org.website && (
        <View style={styles.organizationDetails}>
          <Icon name="globe-outline" size={20} color="#666" />
          <Text style={styles.organizationWebsite}>{org.website}</Text>
        </View>
      )}

      {org.note && (
        <View style={styles.organizationNote}>
          <Icon name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.noteText}>{org.note}</Text>
        </View>
      )}

      {org.subLocations && org.subLocations.map((subLoc, index) => (
        <View key={subLoc.name || index} style={styles.subLocation}>
          <Text style={styles.subLocationName}>{subLoc.name}</Text>
          <View style={styles.organizationDetails}>
            <Icon name="location-outline" size={20} color="#666" />
            <Text style={styles.organizationAddress}>{subLoc.address}</Text>
          </View>
          <View style={styles.organizationDetails}>
            <Icon name="call-outline" size={20} color="#666" />
            <Text style={styles.organizationPhone}>{subLoc.phone}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A154B" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back</Text>
        </View>
        <View style={styles.headerDecoration} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4A154B"]}
          />
        }
      >
        <View style={styles.dashboardContainer}>
          <Text style={styles.dashboardSubtitle}>Your Items Overview</Text>
          <View style={styles.statsContainer}>
            {renderStatCard(
              'Lost',
              stats.lostItems,
              'search-outline',
              '#FF4B4B',
              () => navigation.navigate('ActivityListScreen', { filter: 'lost' })
            )}
            {renderStatCard(
              'Found',
              stats.foundItems,
              'add-circle-outline',
              '#4CAF50',
              () => navigation.navigate('ActivityListScreen', { filter: 'found' })
            )}
            {renderStatCard(
              'Matches',
              stats.matches,
              'git-compare-outline',
              '#4A154B',
              () => navigation.navigate('MatchingScreen')
            )}
            {renderStatCard(
              'Returned',
              stats.returnedItems,
              'checkmark-circle-outline',
              '#2196F3',
              () => navigation.navigate('ActivityListScreen', { filter: 'returned' })
            )}
          </View>

          {/* Updated Donation Section */}
          <View style={styles.donationSection}>
            <Text style={styles.dashboardSubtitle}>Your Unclaimed Items</Text>
            <Text style={styles.donationDescription}>
              These are items you've reported as found that haven't been claimed. You can donate them to one of our partner organizations.
            </Text>
            
            {donationItems.map(item => (
              <React.Fragment key={item.id}>
                {renderDonationItem(item)}
              </React.Fragment>
            ))}

            <Text style={[styles.dashboardSubtitle, { marginTop: 30 }]}>Partner Organizations</Text>
            <Text style={styles.donationDescription}>
              Contact these organizations to arrange your donation:
            </Text>
            
            {organizations.map(org => (
              <React.Fragment key={org.id}>
                {renderOrganization(org)}
              </React.Fragment>
            ))}
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
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  headerDecoration: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    flex: 1,
  },
  dashboardContainer: {
    padding: 20,
    paddingTop: 30,
  },
  dashboardSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 4,
  },
  statCard: {
    width: '47%',
    aspectRatio: 1,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '500',
  },
  donationSection: {
    marginTop: 30,
  },
  donationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  donationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  donationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  donationButton: {
    backgroundColor: '#4A154B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  donationItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  donationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  donationItemDetails: {
    marginBottom: 4,
  },
  donationItemLocation: {
    fontSize: 14,
    color: '#666',
  },
  donationItemDate: {
    fontSize: 14,
    color: '#666',
  },
  donationItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#4A154B',
    borderRadius: 8,
  },
  donationItemButtonText: {
    color: '#4A154B',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  organizationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  organizationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  organizationPhone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  organizationAddress: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  organizationEmail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  organizationWebsite: {
    fontSize: 14,
    color: '#4A154B',
    marginLeft: 12,
    textDecorationLine: 'underline',
  },
  organizationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 12,
    flex: 1,
  },
  subLocation: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subLocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
});

export default DashboardScreen; 