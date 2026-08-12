/**
 * Mock data seeded verbatim from `JTRAX Dashboard.dc.html`.
 *
 * The mockup has no backend; every list below is the same fixture the design
 * renders from. Kept in one module so swapping in real API calls later is a
 * single-file change.
 */
import type { JtraxRole } from './theme';

export type Student = {
  id: string;
  name: string;
  branch: string;
  className: string;
  credit: number;
  expires: string;
  status: 'Normal' | 'Low Credit' | 'Expiring' | 'Expired' | 'Inactive';
  age: number;
  level: string;
  parentName: string;
  parentRelation: string;
  parentPhone: string;
  parentEmail: string;
  parentLineId: string;
  parentLineIdNo: string;
  studentLineId: string;
  studentLineIdNo: string;
  membershipType: string;
  joinedDate: string;
};

export type Payment = {
  name: string;
  className: string;
  credits: string;
  amount: string;
  date: string;
  method: string;
  status: 'Paid' | 'Pending' | 'Refunded';
};

export type CheckinDef = {
  name: string;
  class: string;
  timeIn: string;
  timeOut: string;
  status: 'In class' | 'Dismissed';
  credit: number;
};

export type ClassDef = {
  category: string;
  name: string;
  time: string;
  status: 'Ongoing' | 'Finished';
  students: string[];
  more: number;
  teacher: string;
  room: string;
  roster: string[];
};

export type AdminPerson = {
  id: string;
  name: string;
  role: JtraxRole;
  phone: string;
  email: string;
  lineId: string;
  branch: string;
  lastLogin: string;
  createdDate: string;
  createdBy: string;
  status: string;
  initials: string;
};

export const STUDENTS_SEED: Student[] = [
    {
      "id": "STU-1042",
      "name": "Emma Carter",
      "branch": "Central",
      "className": "Master Class",
      "credit": 8,
      "expires": "30 Jun 2026",
      "status": "Normal",
      "age": 11,
      "level": "Advanced",
      "parentName": "Carol Carter",
      "parentRelation": "Mother",
      "parentPhone": "+66 81 234 5678",
      "parentEmail": "carol.carter@gmail.com",
      "parentLineId": "carol.carter",
      "parentLineIdNo": "U4f81a2c9",
      "studentLineId": "emma.carter",
      "studentLineIdNo": "U71b3e0d4",
      "membershipType": "Standard",
      "joinedDate": "12 Jan 2024"
    },
    {
      "id": "STU-1043",
      "name": "Liam Chen",
      "branch": "Central",
      "className": "Master Class",
      "credit": 12,
      "expires": "14 Jul 2026",
      "status": "Normal",
      "age": 13,
      "level": "Advanced",
      "parentName": "David Chen",
      "parentRelation": "Father",
      "parentPhone": "+66 89 001 2233",
      "parentEmail": "david.chen@gmail.com",
      "parentLineId": "david.chen",
      "parentLineIdNo": "U2c9d817a",
      "studentLineId": "liam.chen",
      "studentLineIdNo": "U9a04f2e1",
      "membershipType": "Standard",
      "joinedDate": "3 Mar 2023"
    },
    {
      "id": "STU-1044",
      "name": "Sofia Reyes",
      "branch": "Sukhumvit",
      "className": "Intermediate Class",
      "credit": 3,
      "expires": "2 Aug 2026",
      "status": "Low Credit",
      "age": 12,
      "level": "Intermediate",
      "parentName": "Maria Reyes",
      "parentRelation": "Mother",
      "parentPhone": "+66 89 771 4420",
      "parentEmail": "maria.reyes@gmail.com",
      "parentLineId": "maria.reyes",
      "parentLineIdNo": "U18e5b3a2",
      "studentLineId": "sofia.reyes",
      "studentLineIdNo": "U60d2c9f7",
      "membershipType": "Standard",
      "joinedDate": "20 Aug 2023"
    },
    {
      "id": "STU-1045",
      "name": "Noah Kim",
      "branch": "Central",
      "className": "Beginner Class",
      "credit": 6,
      "expires": "18 Jun 2026",
      "status": "Expiring",
      "age": 9,
      "level": "Beginner",
      "parentName": "Grace Kim",
      "parentRelation": "Mother",
      "parentPhone": "+66 82 110 4432",
      "parentEmail": "grace.kim@gmail.com",
      "parentLineId": "grace.kim",
      "parentLineIdNo": "U3f7a19c6",
      "studentLineId": "noah.kim",
      "studentLineIdNo": "U85b1e4d0",
      "membershipType": "Standard",
      "joinedDate": "15 Feb 2024"
    },
    {
      "id": "STU-1046",
      "name": "Ava Patel",
      "branch": "Sukhumvit",
      "className": "Beginner Class",
      "credit": 1,
      "expires": "25 May 2026",
      "status": "Low Credit",
      "age": 10,
      "level": "Beginner",
      "parentName": "Raj Patel",
      "parentRelation": "Father",
      "parentPhone": "+66 83 900 1122",
      "parentEmail": "raj.patel@gmail.com",
      "parentLineId": "raj.patel",
      "parentLineIdNo": "U9d2c47a1",
      "studentLineId": "ava.patel",
      "studentLineIdNo": "U4e6b18f3",
      "membershipType": "Standard",
      "joinedDate": "9 Jun 2023"
    },
    {
      "id": "STU-1047",
      "name": "Mia Novak",
      "branch": "Central",
      "className": "Intermediate Class",
      "credit": 9,
      "expires": "9 Sep 2026",
      "status": "Normal",
      "age": 13,
      "level": "Intermediate",
      "parentName": "Elena Novak",
      "parentRelation": "Mother",
      "parentPhone": "+66 84 220 6671",
      "parentEmail": "elena.novak@gmail.com",
      "parentLineId": "elena.novak",
      "parentLineIdNo": "U7a1c95e2",
      "studentLineId": "mia.novak",
      "studentLineIdNo": "U2d8f63a9",
      "membershipType": "Standard",
      "joinedDate": "28 Oct 2022"
    },
    {
      "id": "STU-1048",
      "name": "Leo Adams",
      "branch": "Thonglor",
      "className": "Weekend Class",
      "credit": 4,
      "expires": "20 Jun 2026",
      "status": "Normal",
      "age": 11,
      "level": "Intermediate",
      "parentName": "Tom Adams",
      "parentRelation": "Father",
      "parentPhone": "+66 87 221 9090",
      "parentEmail": "tom.adams@gmail.com",
      "parentLineId": "tom.adams",
      "parentLineIdNo": "U5b3e70c4",
      "studentLineId": "leo.adams",
      "studentLineIdNo": "U1f9a24d6",
      "membershipType": "Standard",
      "joinedDate": "5 Apr 2024"
    },
    {
      "id": "STU-1049",
      "name": "Zoe Bennet",
      "branch": "Thonglor",
      "className": "Weekend Class",
      "credit": 0,
      "expires": "3 May 2026",
      "status": "Expired",
      "age": 14,
      "level": "Advanced",
      "parentName": "Nina Bennet",
      "parentRelation": "Mother",
      "parentPhone": "+66 89 552 6612",
      "parentEmail": "nina.bennet@gmail.com",
      "parentLineId": "nina.bennet",
      "parentLineIdNo": "U6c48d1a3",
      "studentLineId": "zoe.bennet",
      "studentLineIdNo": "U0a7e52f8",
      "membershipType": "Standard",
      "joinedDate": "17 Nov 2023"
    },
    {
      "id": "STU-1050",
      "name": "Kevin Lim",
      "branch": "Central",
      "className": "Beginner Class",
      "credit": 4,
      "expires": "11 Jul 2026",
      "status": "Low Credit",
      "age": 8,
      "level": "Beginner",
      "parentName": "Kevin's Parent",
      "parentRelation": "Father",
      "parentPhone": "+66 81 555 2231",
      "parentEmail": "kevin.dad@gmail.com",
      "parentLineId": "kevin.dad",
      "parentLineIdNo": "U8e2b96a5",
      "studentLineId": "kevin.lim",
      "studentLineIdNo": "U3c5d81f2",
      "membershipType": "Standard",
      "joinedDate": "22 Jul 2022"
    },
    {
      "id": "STU-1051",
      "name": "Daniel Wong",
      "branch": "Sukhumvit",
      "className": "Beginner Class",
      "credit": 2,
      "expires": "29 May 2026",
      "status": "Inactive",
      "age": 15,
      "level": "Beginner",
      "parentName": "Daniel's Parent",
      "parentRelation": "Father",
      "parentPhone": "+66 86 442 1190",
      "parentEmail": "daniel.dad@gmail.com",
      "parentLineId": "daniel.dad",
      "parentLineIdNo": "U4a19c7e0",
      "studentLineId": "daniel.wong",
      "studentLineIdNo": "U7f2e60b1",
      "membershipType": "Standard",
      "joinedDate": "30 Sep 2023"
    }
  ];

export const PAYMENTS_SEED: Payment[] = [
    {
      "name": "Emma Carter",
      "className": "Master Class",
      "credits": "+10",
      "amount": "4,200 THB",
      "date": "15 May 2026",
      "method": "Credit Card",
      "status": "Paid"
    },
    {
      "name": "Liam Chen",
      "className": "Master Class",
      "credits": "+10",
      "amount": "4,200 THB",
      "date": "12 May 2026",
      "method": "Bank Transfer",
      "status": "Paid"
    },
    {
      "name": "Sofia Reyes",
      "className": "Intermediate Class",
      "credits": "+5",
      "amount": "1,800 THB",
      "date": "9 May 2026",
      "method": "PromptPay",
      "status": "Paid"
    },
    {
      "name": "Noah Kim",
      "className": "Beginner Class",
      "credits": "+10",
      "amount": "3,500 THB",
      "date": "8 May 2026",
      "method": "Credit Card",
      "status": "Pending"
    },
    {
      "name": "Ava Patel",
      "className": "Beginner Class",
      "credits": "+5",
      "amount": "1,800 THB",
      "date": "30 Apr 2026",
      "method": "Cash",
      "status": "Paid"
    },
    {
      "name": "Mia Novak",
      "className": "Intermediate Class",
      "credits": "+10",
      "amount": "3,500 THB",
      "date": "28 Apr 2026",
      "method": "Bank Transfer",
      "status": "Paid"
    },
    {
      "name": "Zoe Bennet",
      "className": "Weekend Class",
      "credits": "+5",
      "amount": "1,800 THB",
      "date": "20 Apr 2026",
      "method": "Credit Card",
      "status": "Refunded"
    },
    {
      "name": "Kevin Lim",
      "className": "Beginner Class",
      "credits": "+5",
      "amount": "1,800 THB",
      "date": "18 Apr 2026",
      "method": "PromptPay",
      "status": "Paid"
    }
  ];

export const CHECKIN_DEFS_SEED: CheckinDef[] = [
    {
      "name": "Emma Carter",
      "class": "Master",
      "timeIn": "9:58 AM",
      "timeOut": "12:05 PM",
      "status": "Dismissed",
      "credit": 8
    },
    {
      "name": "Liam Chen",
      "class": "Master",
      "timeIn": "10:02 AM",
      "timeOut": "-",
      "status": "In class",
      "credit": 12
    },
    {
      "name": "Sofia Reyes",
      "class": "Intermediate",
      "timeIn": "1:05 PM",
      "timeOut": "-",
      "status": "In class",
      "credit": 3
    },
    {
      "name": "Noah Kim",
      "class": "Beginner",
      "timeIn": "3:58 PM",
      "timeOut": "-",
      "status": "In class",
      "credit": 6
    },
    {
      "name": "Ava Patel",
      "class": "Beginner",
      "timeIn": "4:02 PM",
      "timeOut": "-",
      "status": "In class",
      "credit": 1
    },
    {
      "name": "Mia Novak",
      "class": "Intermediate",
      "timeIn": "1:10 PM",
      "timeOut": "-",
      "status": "In class",
      "credit": 9
    },
    {
      "name": "Leo Adams",
      "class": "Weekend",
      "timeIn": "8:02 AM",
      "timeOut": "9:30 AM",
      "status": "Dismissed",
      "credit": 4
    },
    {
      "name": "Zoe Bennet",
      "class": "Weekend",
      "timeIn": "8:05 AM",
      "timeOut": "9:30 AM",
      "status": "Dismissed",
      "credit": 15
    }
  ];

export const CLASSES_DEFS_REF: ClassDef[] = [
    {
      "category": "Beginner",
      "name": "Beginner Class",
      "time": "4:00 PM - 5:30 PM",
      "status": "Ongoing",
      "students": [
        "Ava Patel",
        "Noah Kim"
      ],
      "more": 2,
      "teacher": "Jessica Tan",
      "room": "Room C",
      "roster": [
        "Ava Patel",
        "Noah Kim",
        "Rachel Ong",
        "Mason Chu",
        "Lucas Wong"
      ]
    },
    {
      "category": "Master",
      "name": "Master Class",
      "time": "10:00 AM - 12:00 PM",
      "status": "Ongoing",
      "students": [
        "Emma Carter",
        "Liam Chen"
      ],
      "more": 5,
      "teacher": "Jessica Tan",
      "room": "Room A",
      "roster": [
        "Emma Carter",
        "Liam Chen",
        "Kevin Lim",
        "Alex Lee",
        "Rachel Ong",
        "Mason Chu",
        "Lucas Wong"
      ]
    },
    {
      "category": "Intermediate",
      "name": "Intermediate Class",
      "time": "1:00 PM - 3:00 PM",
      "status": "Finished",
      "students": [
        "Sofia Reyes",
        "Mia Novak"
      ],
      "more": 3,
      "teacher": "Jessica Tan",
      "room": "Room B",
      "roster": [
        "Emma Carter",
        "Kevin Lim",
        "Rachel Ong",
        "Alex Lee",
        "Mason Chu"
      ]
    }
  ];

export type Announcement = {
  /** Present on live rows from the backend; absent in the design seed. */
  id?: string;
  title: string;
  audience: string;
  date: string;
  body: string;
};

export type ChatMessage = { from: 'me' | 'them'; text: string; time: string };

export type Conversation = {
  id: string;
  name: string;
  student: string | null;
  studentId?: string;
  time: string;
  unread: number;
  starred: boolean;
  phone: string;
  email: string;
  memberType?: string;
  joined?: string;
  credits?: number | null;
  upcomingClass?: string | null;
  branch?: string | null;
  level?: string | null;
  enrolledClass?: string | null;
  streakDays?: number | null;
  lastClassDate?: string | null;
  tournament?: { name: string; category: string; status: string; paymentStatus: string; registrationDate: string } | null;
  lastPayment?: { name: string; amount: string; date: string; status: string } | null;
  messages: ChatMessage[];
};

export type Participant = {
  name: string;
  rating: number;
  category: string;
  score: string;
  rank: number;
  prize: string;
  paymentStatus: string;
  age: number;
  guardian: string;
  contact: string;
  wins: number;
  losses: number;
  draws: number;
  attendance: string;
  notes: string;
};

export type Tournament = {
  id: string;
  name: string;
  status: 'Ongoing' | 'Completed';
  hasStarted?: boolean;
  date: string;
  venue: string;
  format: string;
  published: boolean;
  categories: string[];
  organizer: string;
  chiefArbiter: string;
  registrationDeadline: string;
  timeControl: string;
  entryFeeMember: string;
  entryFeeNonMember: string;
  earlyBirdFeeMember?: string;
  earlyBirdFeeNonMember?: string;
  earlyBirdStart?: string;
  earlyBirdEnd?: string;
  certificatesNote?: string;
  address: string;
  contactPerson: string;
  maxParticipants: number;
  currentParticipants: number;
  rounds: number;
  revenue: string;
  participants: Participant[];
};

export const ANNOUNCEMENTS_SEED: Announcement[] = [
    {
      "title": "Public Holiday Closure — 3 June",
      "audience": "All Students & Parents",
      "date": "20 May 2026",
      "body": "All branches will be closed on Monday, 3 June for the public holiday. Classes resume Tuesday as usual."
    },
    {
      "title": "WCIB Championship Registration Open",
      "audience": "Tournament Team",
      "date": "15 May 2026",
      "body": "Registration for the WCIB Chess Championship 2026 is now open. Please confirm your category with the front desk by 30 May."
    },
    {
      "title": "New Weekend Batch — Thonglor Branch",
      "audience": "Thonglor Parents",
      "date": "5 May 2026",
      "body": "We are opening a new Saturday morning batch at the Thonglor branch starting June. Limited seats available."
    }
  ];

export const CONVERSATIONS_SEED: Conversation[] = [
    {
      "id": "emma",
      "name": "Emma's Parent",
      "student": "Emma Tan",
      "studentId": "STU-1042",
      "time": "2m",
      "unread": 2,
      "starred": true,
      "phone": "+66 81 234 5678",
      "email": "emma.mom@gmail.com",
      "memberType": "JCA Member",
      "joined": "12 Jan 2024",
      "credits": 12,
      "upcomingClass": "Sat, 24 May 09:00 AM",
      "branch": "Central",
      "level": "Intermediate",
      "enrolledClass": "Master Class",
      "streakDays": 5,
      "lastClassDate": "12 May 2026",
      "tournament": {
        "name": "WCIB Chess Championship 2025",
        "category": "Girls U12",
        "status": "Registered",
        "paymentStatus": "Paid",
        "registrationDate": "15 May 2025"
      },
      "lastPayment": {
        "name": "WCIB Chess Championship 2025",
        "amount": "1,000 THB",
        "date": "15 May 2025",
        "status": "Paid"
      },
      "messages": [
        {
          "from": "them",
          "text": "Hi, I'd like to change Emma's category for the upcoming WCIB Chess Championship.",
          "time": "10:29 AM"
        },
        {
          "from": "me",
          "text": "Hello! Sure, I'd be happy to help you with that. Which category would you like to change it to?",
          "time": "10:30 AM"
        },
        {
          "from": "them",
          "text": "Girls U12 please.",
          "time": "10:30 AM"
        },
        {
          "from": "me",
          "text": "Noted! I have updated Emma's category to Girls U12. Let me know if you need anything else.",
          "time": "10:31 AM"
        },
        {
          "from": "them",
          "text": "Thank you so much!",
          "time": "10:31 AM"
        }
      ]
    },
    {
      "id": "kevin",
      "name": "Kevin's Parent",
      "student": "Kevin Lim",
      "studentId": "STU-1050",
      "time": "18m",
      "unread": 1,
      "starred": false,
      "phone": "+66 81 555 2231",
      "email": "kevin.dad@gmail.com",
      "memberType": "JCA Member",
      "joined": "3 Mar 2023",
      "credits": 4,
      "upcomingClass": "Mon, 26 May 04:00 PM",
      "branch": "Central",
      "level": "Beginner",
      "enrolledClass": "Beginner Class",
      "streakDays": 2,
      "lastClassDate": "8 May 2026",
      "tournament": null,
      "lastPayment": {
        "name": "Monthly Package - 10 Credits",
        "amount": "3,500 THB",
        "date": "2 May 2025",
        "status": "Paid"
      },
      "messages": [
        {
          "from": "them",
          "text": "Has the payment been confirmed?",
          "time": "9:48 AM"
        },
        {
          "from": "me",
          "text": "Yes, confirmed - 10 credits added to the account.",
          "time": "9:50 AM"
        }
      ]
    },
    {
      "id": "sophia",
      "name": "Sophia's Parent",
      "student": "Sophia Reyes",
      "studentId": "STU-1044",
      "time": "1h",
      "unread": 0,
      "starred": true,
      "phone": "+66 89 771 4420",
      "email": "sophia.parent@gmail.com",
      "memberType": "JCA Member",
      "joined": "20 Aug 2023",
      "credits": 3,
      "upcomingClass": "Tue, 27 May 01:00 PM",
      "branch": "Central",
      "level": "Intermediate",
      "enrolledClass": "Intermediate Class",
      "streakDays": 3,
      "lastClassDate": "9 May 2026",
      "tournament": null,
      "lastPayment": {
        "name": "Monthly Package - 5 Credits",
        "amount": "1,800 THB",
        "date": "18 Apr 2025",
        "status": "Paid"
      },
      "messages": [
        {
          "from": "me",
          "text": "Reminder: only 3 credits remaining on the account.",
          "time": "8:00 AM"
        },
        {
          "from": "them",
          "text": "Thank you so much!",
          "time": "8:14 AM"
        }
      ]
    },
    {
      "id": "external",
      "name": "External Tournament Inquiry",
      "student": null,
      "time": "Yesterday",
      "unread": 3,
      "starred": false,
      "phone": "+66 92 010 8834",
      "email": "guest.inquiry@gmail.com",
      "memberType": "Guest",
      "joined": "-",
      "credits": null,
      "upcomingClass": null,
      "branch": "-",
      "tournament": null,
      "lastPayment": null,
      "messages": [
        {
          "from": "them",
          "text": "I would like to know more about the WCIB Chess Championship for non-members.",
          "time": "Yest, 3:10 PM"
        }
      ]
    },
    {
      "id": "daniel",
      "name": "Daniel's Parent",
      "student": "Daniel Wong",
      "studentId": "STU-1051",
      "time": "Mon",
      "unread": 0,
      "starred": false,
      "phone": "+66 86 442 1190",
      "email": "daniel.dad@gmail.com",
      "memberType": "JCA Member",
      "joined": "11 Nov 2022",
      "credits": 8,
      "upcomingClass": "Thu, 29 May 04:00 PM",
      "branch": "Central",
      "level": "Beginner",
      "enrolledClass": "Beginner Class",
      "streakDays": 1,
      "lastClassDate": "5 May 2026",
      "tournament": null,
      "lastPayment": {
        "name": "Monthly Package - 10 Credits",
        "amount": "3,500 THB",
        "date": "28 Apr 2025",
        "status": "Paid"
      },
      "messages": [
        {
          "from": "them",
          "text": "Can I get the schedule for this week?",
          "time": "Mon, 2:00 PM"
        }
      ]
    },
    {
      "id": "mia",
      "name": "Mia's Parent",
      "student": "Mia Novak",
      "studentId": "STU-1047",
      "time": "Sun",
      "unread": 0,
      "starred": false,
      "phone": "+66 84 220 6671",
      "email": "mia.parent@gmail.com",
      "memberType": "JCA Member",
      "joined": "5 Feb 2024",
      "credits": 6,
      "upcomingClass": "Wed, 28 May 01:00 PM",
      "branch": "Central",
      "level": "Intermediate",
      "enrolledClass": "Intermediate Class",
      "streakDays": 4,
      "lastClassDate": "10 May 2026",
      "tournament": null,
      "lastPayment": {
        "name": "Monthly Package - 5 Credits",
        "amount": "1,800 THB",
        "date": "20 Apr 2025",
        "status": "Paid"
      },
      "messages": [
        {
          "from": "them",
          "text": "What time is the class tomorrow?",
          "time": "Sun, 5:30 PM"
        }
      ]
    }
  ];

export const TOURNAMENTS_SEED: Tournament[] = [
    {
      "id": "wcib-2026",
      "name": "WCIB Chess Championship 2026",
      "status": "Ongoing",
      "hasStarted": true,
      "date": "24–25 May 2026",
      "venue": "Paradise Park",
      "format": "Swiss System",
      "published": true,
      "categories": [
        "Open U12",
        "Open U14",
        "Open U18"
      ],
      "organizer": "JCA Chess Academy",
      "chiefArbiter": "Somchai Prasert (FIDE Arbiter)",
      "registrationDeadline": "20 May 2026",
      "timeControl": "90 min + 30 sec",
      "entryFeeMember": "500 THB",
      "entryFeeNonMember": "700 THB",
      "earlyBirdFeeMember": "400 THB",
      "earlyBirdFeeNonMember": "600 THB",
      "earlyBirdStart": "30 Apr 2026",
      "earlyBirdEnd": "10 May 2026",
      "certificatesNote": "E-certificates and a medal for all participants.",
      "address": "99 Paradise Park Ave, Bangkok 10110",
      "contactPerson": "Somchai Prasert",
      "maxParticipants": 300,
      "currentParticipants": 284,
      "rounds": 7,
      "revenue": "51,200 THB",
      "participants": [
        {
          "name": "Emma Tan",
          "rating": 1420,
          "category": "U12",
          "score": "6.5/7",
          "rank": 1,
          "prize": "5,000 THB",
          "paymentStatus": "Paid",
          "age": 11,
          "guardian": "Emma's Parent",
          "contact": "+66 81 234 5678",
          "wins": 6,
          "losses": 0,
          "draws": 1,
          "attendance": "7/7",
          "notes": "Champion, undefeated run."
        },
        {
          "name": "Kevin Lim",
          "rating": 1385,
          "category": "U14",
          "score": "6.0/7",
          "rank": 2,
          "prize": "3,000 THB",
          "paymentStatus": "Paid",
          "age": 13,
          "guardian": "Kevin's Parent",
          "contact": "+66 81 555 2231",
          "wins": 5,
          "losses": 0,
          "draws": 2,
          "attendance": "7/7",
          "notes": "Strong endgame play."
        },
        {
          "name": "Sophia Reyes",
          "rating": 1350,
          "category": "U12",
          "score": "5.5/7",
          "rank": 3,
          "prize": "1,500 THB",
          "paymentStatus": "Paid",
          "age": 12,
          "guardian": "Sophia's Parent",
          "contact": "+66 89 771 4420",
          "wins": 5,
          "losses": 1,
          "draws": 1,
          "attendance": "6/7",
          "notes": ""
        },
        {
          "name": "Daniel Wong",
          "rating": 1290,
          "category": "Open",
          "score": "5.0/7",
          "rank": 4,
          "prize": "-",
          "paymentStatus": "Paid",
          "age": 15,
          "guardian": "Daniel's Parent",
          "contact": "+66 86 442 1190",
          "wins": 5,
          "losses": 2,
          "draws": 0,
          "attendance": "7/7",
          "notes": ""
        },
        {
          "name": "Mia Novak",
          "rating": 1210,
          "category": "U14",
          "score": "4.5/7",
          "rank": 5,
          "prize": "-",
          "paymentStatus": "Pending",
          "age": 13,
          "guardian": "Mia's Parent",
          "contact": "+66 84 220 6671",
          "wins": 4,
          "losses": 2,
          "draws": 1,
          "attendance": "6/7",
          "notes": "Payment follow-up needed."
        },
        {
          "name": "Noah Kim",
          "rating": 1180,
          "category": "U12",
          "score": "4.0/7",
          "rank": 6,
          "prize": "-",
          "paymentStatus": "Paid",
          "age": 10,
          "guardian": "Noah's Parent",
          "contact": "+66 82 110 4432",
          "wins": 4,
          "losses": 3,
          "draws": 0,
          "attendance": "7/7",
          "notes": ""
        },
        {
          "name": "Ava Patel",
          "rating": 1140,
          "category": "U12",
          "score": "3.5/7",
          "rank": 7,
          "prize": "-",
          "paymentStatus": "Refunded",
          "age": 11,
          "guardian": "Ava's Parent",
          "contact": "+66 83 900 1122",
          "wins": 3,
          "losses": 3,
          "draws": 1,
          "attendance": "5/7",
          "notes": "Withdrew after round 5, refunded."
        }
      ]
    },
    {
      "id": "spring-open-2026",
      "name": "JCA Spring Open 2026",
      "status": "Completed",
      "date": "2–3 Mar 2026",
      "venue": "Paradise Park",
      "format": "Round Robin",
      "published": true,
      "categories": [
        "Open U10",
        "Open U12",
        "Open U14"
      ],
      "organizer": "JCA Chess Academy",
      "chiefArbiter": "Nattapong Srisai (FIDE Arbiter)",
      "registrationDeadline": "25 Feb 2026",
      "timeControl": "60 min + 15 sec",
      "entryFeeMember": "400 THB",
      "entryFeeNonMember": "600 THB",
      "earlyBirdFeeMember": "300 THB",
      "earlyBirdFeeNonMember": "500 THB",
      "earlyBirdStart": "5 Feb 2026",
      "earlyBirdEnd": "18 Feb 2026",
      "certificatesNote": "E-certificates and a Gold Medal for all participants.",
      "address": "99 Paradise Park Ave, Bangkok 10110",
      "contactPerson": "Nattapong Srisai",
      "maxParticipants": 300,
      "currentParticipants": 267,
      "rounds": 6,
      "revenue": "16,000 THB",
      "participants": [
        {
          "name": "Liam Chen",
          "rating": 1300,
          "category": "U14",
          "score": "5.0/6",
          "rank": 1,
          "prize": "2,500 THB",
          "paymentStatus": "Paid",
          "age": 13,
          "guardian": "Liam's Parent",
          "contact": "+66 89 001 2233",
          "wins": 5,
          "losses": 1,
          "draws": 0,
          "attendance": "6/6",
          "notes": "Champion."
        },
        {
          "name": "Zoe Bennet",
          "rating": 1260,
          "category": "U14",
          "score": "4.5/6",
          "rank": 2,
          "prize": "1,500 THB",
          "paymentStatus": "Paid",
          "age": 14,
          "guardian": "Zoe's Parent",
          "contact": "+66 89 552 6612",
          "wins": 4,
          "losses": 1,
          "draws": 1,
          "attendance": "6/6",
          "notes": ""
        },
        {
          "name": "Leo Adams",
          "rating": 1230,
          "category": "U12",
          "score": "4.0/6",
          "rank": 3,
          "prize": "800 THB",
          "paymentStatus": "Paid",
          "age": 11,
          "guardian": "Leo's Parent",
          "contact": "+66 87 221 9090",
          "wins": 4,
          "losses": 2,
          "draws": 0,
          "attendance": "5/6",
          "notes": ""
        },
        {
          "name": "Mason Chu",
          "rating": 1180,
          "category": "U12",
          "score": "3.0/6",
          "rank": 4,
          "prize": "-",
          "paymentStatus": "Paid",
          "age": 10,
          "guardian": "Mason's Parent",
          "contact": "+66 85 664 1120",
          "wins": 3,
          "losses": 3,
          "draws": 0,
          "attendance": "6/6",
          "notes": ""
        }
      ]
    },
    {
      "id": "youth-rapid-2025",
      "name": "National Youth Rapid 2025",
      "status": "Completed",
      "date": "14 Dec 2025",
      "venue": "Paradise Park",
      "format": "Swiss System",
      "published": true,
      "categories": [
        "Open U14",
        "Open U18",
        "Girls U14"
      ],
      "organizer": "JCA Chess Academy",
      "chiefArbiter": "Somchai Prasert (FIDE Arbiter)",
      "registrationDeadline": "5 Dec 2025",
      "timeControl": "15 min + 10 sec",
      "entryFeeMember": "400 THB",
      "entryFeeNonMember": "600 THB",
      "earlyBirdFeeMember": "300 THB",
      "earlyBirdFeeNonMember": "500 THB",
      "earlyBirdStart": "18 Nov 2025",
      "earlyBirdEnd": "30 Nov 2025",
      "certificatesNote": "E-certificates and a Gold Medal for all participants.",
      "address": "99 Paradise Park Ave, Bangkok 10110",
      "contactPerson": "Somchai Prasert",
      "maxParticipants": 300,
      "currentParticipants": 291,
      "rounds": 5,
      "revenue": "28,800 THB",
      "participants": [
        {
          "name": "Alex Lee",
          "rating": 1450,
          "category": "U16",
          "score": "5.0/5",
          "rank": 1,
          "prize": "4,000 THB",
          "paymentStatus": "Paid",
          "age": 15,
          "guardian": "Alex's Parent",
          "contact": "+66 90 112 4455",
          "wins": 5,
          "losses": 0,
          "draws": 0,
          "attendance": "5/5",
          "notes": "Perfect score."
        },
        {
          "name": "Rachel Ong",
          "rating": 1400,
          "category": "U16",
          "score": "4.0/5",
          "rank": 2,
          "prize": "2,000 THB",
          "paymentStatus": "Paid",
          "age": 14,
          "guardian": "Rachel's Parent",
          "contact": "+66 91 223 5566",
          "wins": 4,
          "losses": 1,
          "draws": 0,
          "attendance": "5/5",
          "notes": ""
        },
        {
          "name": "Lucas Wong",
          "rating": 1370,
          "category": "U16",
          "score": "3.5/5",
          "rank": 3,
          "prize": "1,000 THB",
          "paymentStatus": "Paid",
          "age": 15,
          "guardian": "Lucas's Parent",
          "contact": "+66 92 334 6677",
          "wins": 3,
          "losses": 1,
          "draws": 1,
          "attendance": "4/5",
          "notes": ""
        }
      ]
    }
  ];
