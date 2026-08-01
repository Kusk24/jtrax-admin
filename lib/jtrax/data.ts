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

export const ADMIN_SEED: AdminPerson[] = [
    {
      "id": "jirapak",
      "name": "Mr. Jirapak",
      "role": "Super Admin",
      "phone": "+66 81-234-5678",
      "email": "jirapak@jca.ac.th",
      "lineId": "jirapak.jca",
      "branch": "Central",
      "lastLogin": "Today • 9:18 AM",
      "createdDate": "12 Jan 2024",
      "createdBy": "System",
      "status": "Active",
      "initials": "MJ"
    },
    {
      "id": "chloe",
      "name": "Ms. Chloe Claire",
      "role": "Admin",
      "phone": "+66 89-555-2211",
      "email": "chloe.claire@jca.ac.th",
      "lineId": "chloe.claire",
      "branch": "Central",
      "lastLogin": "Yesterday • 4:42 PM",
      "createdDate": "3 Mar 2024",
      "createdBy": "Mr. Jirapak",
      "status": "Active",
      "initials": "CC"
    },
    {
      "id": "pai",
      "name": "Mr. Pai Pinatpong",
      "role": "Admin",
      "phone": "+66 92-118-9034",
      "email": "pai.pinatpong@jca.ac.th",
      "lineId": "pai.pinatpong",
      "branch": "Central",
      "lastLogin": "3 days ago • 11:05 AM",
      "createdDate": "18 Jun 2024",
      "createdBy": "Mr. Jirapak",
      "status": "Active",
      "initials": "PP"
    },
    {
      "id": "jessica",
      "name": "Ms. Jessica Jolin",
      "role": "Receptionist",
      "phone": "+66 86-330-7712",
      "email": "jessica.tan@jca.ac.th",
      "lineId": "jessica.tan",
      "branch": "Central",
      "lastLogin": "Today • 8:52 AM",
      "createdDate": "22 Jul 2024",
      "createdBy": "Mr. Jirapak",
      "status": "Active",
      "initials": "JJ"
    }
  ];
