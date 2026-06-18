import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { chatbotAPI } from "../services/apiService";
import { useTheme } from "../context/ThemeContext";
import { Trash2, X, Send, MessageCircle } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

const GlobalChatbot = () => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isOpen]);

  const loadChatHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem("chatMessages");
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch (e) {
      console.log("Failed to load chat history", e);
    }
  };

  const saveChatHistory = async (newMessages: any[]) => {
    try {
      await AsyncStorage.setItem("chatMessages", JSON.stringify(newMessages));
    } catch (e) {
      console.log("Failed to save chat history", e);
    }
  };

  const clearChat = async () => {
    setMessages([]);
    await AsyncStorage.removeItem("chatMessages");
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = { text: message, sender: "user" };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const res = await chatbotAPI.query(message);
      const botMsg = { text: res.data, sender: "bot" };
      const nextMessages = [...updatedMessages, botMsg];
      setMessages(nextMessages);
      saveChatHistory(nextMessages);
    } catch (err: any) {
      console.error("CHATBOT ERROR:", err);
      const errorMsg = {
        text: err.response?.data || "❌ Something went wrong",
        sender: "bot",
      };
      const nextMessages = [...updatedMessages, errorMsg];
      setMessages(nextMessages);
      saveChatHistory(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[styles.floatingButton, { backgroundColor: theme.primary }]}
        activeOpacity={0.8}
      >
        <MessageCircle color="white" size={30} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.avoidingView}
        pointerEvents="box-none"
      >
        <View style={[styles.chatWindow, { backgroundColor: "#0f172a" }]} pointerEvents="auto">
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>HR Assistant</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={clearChat} style={styles.iconBtn}>
                <Trash2 color="white" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.iconBtn}>
                <X color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* RESPONSE AREA */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.sender === "user" ? styles.userBubble : styles.botBubble,
                  { backgroundColor: msg.sender === "user" ? theme.primary : "#334155" }
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: "#334155" }]}>
                <ActivityIndicator color="white" size="small" />
              </View>
            )}
          </ScrollView>

          {/* INPUT AREA */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Enter name or ID..."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline={false}
            />
            <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: theme.primary }]}>
              <Send color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  avoidingView: {
    width: '100%',
    height: '100%',
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  floatingButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10001, // Ensure it stays on top
  },
  chatWindow: {
    width: width * 0.85,
    height: height * 0.5,
    marginRight: 20,
    marginBottom: 170,
    borderRadius: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#1e293b",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: 'Times New Roman',
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#020617",
  },
  messagesContent: {
    padding: 12,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  botBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Times New Roman',
  },
  inputArea: {
    backgroundColor: "#1e293b",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: "#0f172a",
    fontSize: 14,
    fontFamily: 'Times New Roman',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default GlobalChatbot;
