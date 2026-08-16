/**
 * The console's display types.
 *
 * This module used to carry the design's fixtures alongside them. Every screen
 * that has a backend now reads real rows through `lib/live.ts`, so what is left
 * is the shapes those adapters produce — plus the chat fixtures, which have no
 * table behind them yet.
 */
import type { JtraxRole } from './theme';

export type Student = {
  id: string;
  name: string;
  /** Login email from user_account, served as a staff-only derived column.
      Optional because a student registered at the desk has no account until
      someone issues one, and the mock fixtures below predate the field. */
  email?: string;
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

/** A parent as the console lists them: their own contact details plus the
    children they are linked to through `student_parent`. */
export type ParentPerson = {
  id: string;
  name: string;
  loginEmail: string;
  phone: string;
  email: string;
  lineId: string;
  children: { id: string; name: string; relation: string; className: string; credit: number }[];
};

export type Payment = {
  /** Present on live rows; absent in the design seed. */
  id?: string;
  name: string;
  className: string;
  credits: string;
  amount: string;
  /** Formatted for display. `isoDate` is the same day unformatted, which is
      what a date range can actually be compared against. */
  date: string;
  isoDate?: string;
  method: string;
  /** The guardian recorded as paying, when one was. */
  payer?: string;
  /** True once the student this was for has been deleted: the names on the
      row are all that is left of who it was about. */
  detached?: boolean;
  status: 'Paid' | 'Pending' | 'Refunded';
};

export type CheckinDef = {
  /** The attendance row behind this line, so dismissing can write to it. */
  attendanceId?: string;
  studentId?: string;
  name: string;
  class: string;
  timeIn: string;
  timeOut: string;
  status: 'In class' | 'Dismissed';
  credit: number;
};

export type ClassDef = {
  /* Present on live rows: the session being shown and the class it belongs to.
     Absent in the design seed, which had no ids. */
  id?: string;
  classId?: string;
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
  /* Present on live rows; the design seed has neither. `categoryId` is what the
     edit form binds to — `category` is the resolved name, for display. */
  id?: string;
  studentId?: string;
  categoryId?: string;
  dateOfBirth?: string;
  feeCharged?: number;
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
  /** The same categories with their ids, for the screens that manage them. */
  categoryRows?: Array<{ id: string; name: string }>;
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

