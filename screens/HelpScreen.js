import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const HelpScreen = () => {
  const navigation = useNavigation();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      question: 'How do I report a lost item?',
      answer: 'Go to the home screen and tap "Report Lost". Fill in the details about your lost item, including description, location, and photos if available. Submit the form to create your lost item report.'
    },
    {
      question: 'How do I report a found item?',
      answer: 'On the home screen, tap "Report Found". Provide details about the item you found, including where and when you found it. Add photos if possible to help identify the owner.'
    },
    {
      question: 'How does the matching system work?',
      answer: 'Our system automatically compares lost and found item reports based on descriptions, locations, and other details. When a potential match is found, both parties are notified to verify the match.'
    },
    {
      question: 'Is my personal information safe?',
      answer: 'Yes, we take privacy seriously. Your contact information is only shared when there is a confirmed match, and you can choose what information to share with the other party.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Go to your profile screen and tap the edit button. You can update your name, email, phone number, and profile picture. Remember to save your changes.'
    },
    {
      question: 'What should I do if I find a match?',
      answer: 'When you receive a match notification, review the details carefully. If you confirm it\'s your item, you can contact the finder through the app\'s messaging system to arrange the return.'
    }
  ];

  const handleEmailPress = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Icon 
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#3b0b40" 
                />
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactText}>
              Need additional help? Contact our support team at:
            </Text>
            <TouchableOpacity 
              style={styles.emailButton}
              onPress={() => handleEmailPress('01-136212-041@student.bahria.edu.pk')}
            >
              <Icon name="mail-outline" size={20} color="#3b0b40" />
              <Text style={styles.emailText}>01-136212-041@student.bahria.edu.pk</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.emailButton}
              onPress={() => handleEmailPress('01-136212-016@student.bahria.edu.pk')}
            >
              <Icon name="mail-outline" size={20} color="#3b0b40" />
              <Text style={styles.emailText}>01-136212-016@student.bahria.edu.pk</Text>
            </TouchableOpacity>
          </View>
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3b0b40',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b0b40',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  emailText: {
    fontSize: 14,
    color: '#3b0b40',
    marginLeft: 12,
  },
});

export default HelpScreen; 