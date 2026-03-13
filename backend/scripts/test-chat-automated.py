#!/usr/bin/env python3
import boto3
import json
import time
import sys

connect = boto3.client('connect')
INSTANCE_ID = 'a88ddab9-3b29-409f-87f0-bdb614abafef'
CHAT_FLOW_ID = 'e9ead9c0-9b7d-472d-8379-bb58360f87dd'

def start_chat():
    """Start a chat session"""
    response = connect.start_chat_contact(
        InstanceId=INSTANCE_ID,
        ContactFlowId=CHAT_FLOW_ID,
        ParticipantDetails={'DisplayName': 'Automated Test'}
    )
    return response

def send_message(participant_token, message):
    """Send a message in the chat"""
    participant = boto3.client('connectparticipant')
    
    # Create connection
    conn_response = participant.create_participant_connection(
        ParticipantToken=participant_token,
        Type=['CONNECTION_CREDENTIALS']
    )
    
    connection_token = conn_response['ConnectionCredentials']['ConnectionToken']
    
    # Send message
    send_response = participant.send_message(
        ConnectionToken=connection_token,
        ContentType='text/plain',
        Content=message
    )
    
    return send_response

def get_transcript(participant_token):
    """Get chat transcript"""
    participant = boto3.client('connectparticipant')
    
    conn_response = participant.create_participant_connection(
        ParticipantToken=participant_token,
        Type=['CONNECTION_CREDENTIALS']
    )
    
    connection_token = conn_response['ConnectionCredentials']['ConnectionToken']
    
    transcript = participant.get_transcript(
        ConnectionToken=connection_token
    )
    
    return transcript.get('Transcript', [])

def main():
    message = sys.argv[1] if len(sys.argv) > 1 else "Where is my tax refund?"
    
    print("🚀 Starting automated chat test...")
    print(f"📝 Message: {message}")
    print("")
    
    # Start chat
    chat = start_chat()
    contact_id = chat['ContactId']
    participant_token = chat['ParticipantToken']
    
    print(f"✅ Chat started: {contact_id}")
    print("")
    
    # Wait for connection
    time.sleep(2)
    
    # Send message
    print(f"📤 Sending: {message}")
    send_message(participant_token, message)
    
    # Wait for response
    print("⏳ Waiting for AI response...")
    time.sleep(5)
    
    # Get transcript
    transcript = get_transcript(participant_token)
    
    print("")
    print("📋 TRANSCRIPT:")
    print("━" * 60)
    for item in transcript:
        sender = item.get('ParticipantRole', 'UNKNOWN')
        content = item.get('Content', '')
        timestamp = item.get('AbsoluteTime', '')
        
        if sender == 'CUSTOMER':
            print(f"👤 You: {content}")
        elif sender == 'SYSTEM':
            print(f"🤖 AI: {content}")
        else:
            print(f"📢 {sender}: {content}")
    
    print("━" * 60)
    print("")
    print(f"✅ Test complete - Contact ID: {contact_id}")
    print("")
    print("Check dashboard for real-time updates:")
    print("http://treasury-cxai-ui-1772478390.s3-website-us-east-1.amazonaws.com")

if __name__ == '__main__':
    main()
