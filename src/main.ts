/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.info('hSECURITIES HQ Script initialized');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.info('hSECURITIES HQ WorkAdventure Scripting API ready');
    console.info('Player tags: ', WA.player.tags);

    // 1. RECEPTION & CAMPUS WELCOME
    WA.room.area.onEnter('receptionArea').subscribe(() => {
        showTemporaryPopup(
            "receptionPopup",
            "🛡️ Welcome to hSECURITIES HQ — Modern Cybersecurity Campus & Training Institute! Use portals or walkways to navigate.",
            6000
        );
    });

    // 2. WEBINAR AUDITORIUM
    WA.room.area.onEnter('auditoriumStage').subscribe(() => {
        showTemporaryPopup(
            "auditoriumStagePopup",
            "🎤 You are on the Keynote Stage! Speaker megaphone mode is active — attendees in the auditorium can hear you.",
            5000
        );
    });

    WA.room.area.onEnter('auditoriumAudience').subscribe(() => {
        showTemporaryPopup(
            "auditoriumAudiencePopup",
            "🎟️ Webinar Auditorium: Take a seat to view the presentation screen or join the group discussion.",
            4000
        );
    });

    // 3. TRAINING HALL
    WA.room.area.onEnter('trainingHall').subscribe(() => {
        showTemporaryPopup(
            "trainingPopup",
            "💻 Cyber Defense Lab: 24 hands-on training workstations. Press SPACE near desks to launch lab modules.",
            4000
        );
    });

    // 4. CONFERENCE ROOM
    WA.room.area.onEnter('conferenceBoardroom').subscribe(() => {
        showTemporaryPopup(
            "boardroomPopup",
            "📊 Executive Boardroom: Video conferencing suite active. Press SPACE at the table to join Jitsi.",
            4000
        );
    });

    // 5. CTF ARENA
    WA.room.area.onEnter('ctfScoreboard').subscribe(() => {
        showTemporaryPopup(
            "ctfScoreboardPopup",
            "🏆 CTF Cyber Range: Red Team (West) vs Blue Team (East). Press SPACE to view scoreboard and challenges.",
            5000
        );
    });

    WA.room.area.onEnter('ctfArenaRedTeam').subscribe(() => {
        showTemporaryPopup(
            "ctfRedPopup",
            "🔴 Red Team Battlestation: Offensive Security & Penetration Testing Pod.",
            3500
        );
    });

    WA.room.area.onEnter('ctfArenaBlueTeam').subscribe(() => {
        showTemporaryPopup(
            "ctfBluePopup",
            "🔵 Blue Team Battlestation: Defensive Security & Threat Hunting Pod.",
            3500
        );
    });

    // 6. NETWORKING LOUNGE
    WA.room.area.onEnter('coffeeBar').subscribe(() => {
        showTemporaryPopup(
            "cafePopup",
            "☕ Cyber Cafe & Refreshments: Grab a virtual coffee and meet fellow researchers.",
            3500
        );
    });

    WA.room.area.onEnter('networkingLoungePod1').subscribe(() => {
        showTemporaryPopup(
            "loungePod1Popup",
            "🤫 Soundproof Discussion Alcove: Conversations here are private and isolated from outside.",
            4000
        );
    });

    WA.room.area.onEnter('networkingLoungePod2').subscribe(() => {
        showTemporaryPopup(
            "loungePod2Popup",
            "🤫 Soundproof Discussion Alcove: Private audio proximity circle.",
            4000
        );
    });

    // 7. STAFF OFFICE
    WA.room.area.onEnter('staffOfficeArea').subscribe(() => {
        showTemporaryPopup(
            "staffPopup",
            "🧑‍🏫 Faculty & Staff Wing: Instructor offices, research stations, and academic advising.",
            4000
        );
    });

    // 8. MEETING ROOMS
    WA.room.area.onEnter('meetingPodA').subscribe(() => {
        showTemporaryPopup(
            "meetingAPopup",
            "🔒 Threat Intel Pod: Breakout meeting room for tactical security briefings.",
            3500
        );
    });

    WA.room.area.onEnter('meetingPodB').subscribe(() => {
        showTemporaryPopup(
            "meetingBPopup",
            "🚨 Incident Response Pod: Soundproof war room for crisis drills and debriefs.",
            3500
        );
    });

    // 9. CAREER & PLACEMENT CENTER
    WA.room.area.onEnter('careerJobBoard').subscribe(() => {
        showTemporaryPopup(
            "careerPopup",
            "💼 Career & Placement Center: Explore cybersecurity job postings and internship openings.",
            4000
        );
    });

    WA.room.area.onEnter('careerInterviewBoothA').subscribe(() => {
        showTemporaryPopup(
            "interviewAPopup",
            "👔 Private Interview Suite A: 1-on-1 mock interview and resume review.",
            3500
        );
    });

    WA.room.area.onEnter('careerInterviewBoothB').subscribe(() => {
        showTemporaryPopup(
            "interviewBPopup",
            "👔 Private Interview Suite B: Technical candidate assessment booth.",
            3500
        );
    });

    // 10. SERVER ROOM & SOC VAULT
    WA.room.area.onEnter('serverRestrictedZone').subscribe(() => {
        showTemporaryPopup(
            "socPopup",
            "⚠️ RESTRICTED SECURITY VAULT: Data Center & 24/7 Security Operations Center (SOC).",
            4000
        );
    });

    // Subscribe to area exits to close popups cleanly
    const allAreas = [
        'receptionArea', 'auditoriumStage', 'auditoriumAudience', 'trainingHall',
        'conferenceBoardroom', 'ctfScoreboard', 'ctfArenaRedTeam', 'ctfArenaBlueTeam',
        'coffeeBar', 'networkingLoungePod1', 'networkingLoungePod2', 'staffOfficeArea',
        'meetingPodA', 'meetingPodB', 'careerJobBoard', 'careerInterviewBoothA',
        'careerInterviewBoothB', 'serverRestrictedZone'
    ];

    allAreas.forEach(areaName => {
        WA.room.area.onLeave(areaName).subscribe(closePopup);
    });

    // Bootstrap Scripting API Extra for additional features (sound, doors, variables)
    bootstrapExtra().then(() => {
        console.info('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function showTemporaryPopup(id: string, text: string, durationMs: number = 4000) {
    closePopup();
    currentPopup = WA.ui.openPopup(id, text, []);
    setTimeout(() => {
        if (currentPopup && currentPopup.id === id) {
            closePopup();
        }
    }, durationMs);
}

function closePopup() {
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

export {};
