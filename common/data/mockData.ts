import { type Ticket, type CustomerProfile, type EngineerProfile } from '@common/types';

// Mock customer profiles for the tickets
const mockCustomer1: CustomerProfile = {
  id: 'CUST-001',
  name: 'Alice Johnson',
  type: 'customer',
  email: 'alice@example.com'
};

const mockCustomer2: CustomerProfile = {
  id: 'CUST-002',
  name: 'Bob Smith',
  type: 'customer',
  email: 'bob@example.com'
};

const mockCustomer3: CustomerProfile = {
  id: 'CUST-003',
  name: 'Carol Davis',
  type: 'customer',
  email: 'carol@example.com'
};

// Mock engineer profile for assigned tickets
const mockEngineer: EngineerProfile = {
  id: 'ENG-001',
  name: 'John',
  type: 'engineer',
  email: 'john@example.com',
  specialties: ['frontend', 'backend']
};

// Mock tickets for dashboard development
export const mockTickets: Ticket[] = [
  // New/Waiting tickets
  {
    id: '0325433a-97f3-4fdc-ab3c-a5563e22bb3f',
    status: 'waiting',
    summary: 'hi',
    estimatedTime: '15-30 min',
    problemDescription: `=== AUTO-CAPTURED DEBUG INFO ===

=== Page Information ===
URL: https://lovable.dev/projects/1c92a472-e873-4378-bf0d-946f822f10bf
Captured: 2025-09-12T12:52:40.203Z

=== React Components Found ===
None detected

=== JavaScript Errors ===
https://lovable.dev/projects/1c92a472-e873-4378-bf0d-946f822f10bf`,
    createdBy: mockCustomer1,
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    elapsedTime: 300, // 5 minutes in seconds
  },
  {
    id: 'b234567c-98e4-5fdc-bc4d-b6674e33cc4g',
    status: 'waiting',
    summary: 'Login not working',
    estimatedTime: '10-20 min',
    problemDescription: 'User cannot login with correct credentials',
    createdBy: mockCustomer2,
    createdAt: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
    elapsedTime: 720, // 12 minutes in seconds
    abandonedAt: new Date(Date.now() - 3 * 60 * 1000), // Abandoned 3 minutes ago
  },

  // Active tickets
  {
    id: 'c345678d-99e5-6fed-cd5e-c7785e44dd5h',
    status: 'in-progress',
    summary: 'hi',
    estimatedTime: '15-30 min',
    problemDescription: `=== AUTO-CAPTURED DEBUG INFO ===

=== Page Information ===
URL: https://lovable.dev/projects/1c92a472-e873-4378-bf0d-946f822f10bf
Captured: 2025-09-12T12:52:40.203Z

=== React Components Found ===
None detected

=== JavaScript Errors ===
https://lovable.dev/projects/1c92a472-e873-4378-bf0d-946f822f10bf

=== HTML Source (first 2000 chars) ===`,
    createdBy: mockCustomer3,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 7 * 60 * 1000), // 7 minutes ago
    claimedAt: new Date(Date.now() - 2 * 60 * 1000), // claimed 2 minutes ago
    elapsedTime: 120, // 2 minutes since claimed
  },

  // Completed tickets
  {
    id: '14b9e620-6446-4e6e-980f-00e3d8b8b7ac',
    status: 'completed',
    summary: 'hi',
    estimatedTime: '15-30 min',
    problemDescription: 'Customer support issue resolved',
    createdBy: mockCustomer1,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    claimedAt: new Date(Date.now() - 115 * 60 * 1000), // claimed 115 minutes ago
    resolvedAt: new Date(Date.now() - 90 * 60 * 1000), // resolved 90 minutes ago
    elapsedTime: 0, // completed
  },
  {
    id: '54c911d0-a2f7-41aa-b046-420d17fba563',
    status: 'completed',
    summary: 'help',
    estimatedTime: '15-30 min',
    problemDescription: 'User needed assistance with feature',
    createdBy: mockCustomer2,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    claimedAt: new Date(Date.now() - 175 * 60 * 1000), // claimed 175 minutes ago
    resolvedAt: new Date(Date.now() - 150 * 60 * 1000), // resolved 150 minutes ago
    elapsedTime: 0, // completed
  },
  {
    id: '813ebf45-0e67-4d96-98e7-ad0d7a416f9c',
    status: 'completed',
    summary: 'hi',
    estimatedTime: '15-30 min',
    problemDescription: 'General inquiry resolved',
    createdBy: mockCustomer3,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    claimedAt: new Date(Date.now() - 235 * 60 * 1000), // claimed 235 minutes ago
    resolvedAt: new Date(Date.now() - 210 * 60 * 1000), // resolved 210 minutes ago
    elapsedTime: 0, // completed
  },
  {
    id: 'f4cc3bd6-0285-4c27-bab2-0f07668a4088',
    status: 'auto-completed',
    summary: 'Hi',
    estimatedTime: '15-30 min',
    problemDescription: 'Issue auto-resolved after timeout',
    createdBy: mockCustomer1,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    claimedAt: new Date(Date.now() - 295 * 60 * 1000), // claimed 295 minutes ago
    resolvedAt: new Date(Date.now() - 270 * 60 * 1000), // auto-resolved 270 minutes ago
    elapsedTime: 0, // completed
  },
  {
    id: '3a8c6ba5-762d-4eba-9e91-aa97fedd1913',
    status: 'completed',
    summary: 'Help',
    estimatedTime: '15-30 min',
    problemDescription: 'Customer assistance completed',
    createdBy: mockCustomer2,
    assignedTo: mockEngineer,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    claimedAt: new Date(Date.now() - 355 * 60 * 1000), // claimed 355 minutes ago
    resolvedAt: new Date(Date.now() - 330 * 60 * 1000), // resolved 330 minutes ago
    elapsedTime: 0, // completed
  },
];

// Environment variables
export const AUTO_COMPLETE_TIMEOUT_MINUTES = parseInt(import.meta.env.VITE_AUTO_COMPLETE_TIMEOUT_MINUTES || '30');