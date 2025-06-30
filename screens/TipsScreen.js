import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const TipsScreen = () => {
  const navigation = useNavigation();

  const tips = [
    {
      title: 'Report Lost Items Quickly',
      description: 'The sooner you report a lost item, the higher the chances of finding it. Include detailed descriptions and photos if possible.',
      icon: 'time-outline'
    },
    {
      title: 'Be Specific in Descriptions',
      description: 'Provide detailed information about your lost item, including brand, color, size, and any unique identifying features.',
      icon: 'create-outline'
    },
    {
      title: 'Check Found Items Regularly',
      description: 'Regularly check the found items section to see if your lost item has been reported by someone.',
      icon: 'search-outline'
    },
    {
      title: 'Use Location Features',
      description: 'Enable location services to help narrow down the search area for your lost items.',
      icon: 'location-outline'
    },
    {
      title: 'Keep Contact Information Updated',
      description: 'Ensure your contact information is current so you can be reached quickly if your item is found.',
      icon: 'person-outline'
    },
    {
      title: 'Be Proactive in Communication',
      description: 'Respond promptly to messages about potential matches to speed up the recovery process.',
      icon: 'chatbubble-outline'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3d0c45" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tips & Advice</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tipsContainer}>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Icon name={tip.icon} size={24} color="#3b0b40" />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3d0c45',
    paddingTop: STATUSBAR_HEIGHT + 25,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tipsContainer: {
    padding: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b0b40',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TipsScreen; 