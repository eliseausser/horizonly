import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // 1. Vérifier l'utilisateur MERGE
    // =====================================================

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const mergeAccessToken = authHeader.replace("Bearer ", "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${mergeAccessToken}`,
          apikey: anonKey,
        },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Session MERGE invalide" },
        { status: 401 }
      );
    }

    const user = await userResponse.json();

    // =====================================================
    // 2. Récupérer le refresh token Google
    // =====================================================

    const { data: connection, error: connectionError } =
      await supabaseAdmin
        .from("google_calendar_connections")
        .select("refresh_token")
        .eq("user_id", user.id)
        .single();

    if (connectionError || !connection?.refresh_token) {
      return NextResponse.json(
        {
          error: "Google Agenda n'est pas connecté",
          needsGoogleConnection: true,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // 3. Obtenir un nouvel access token Google
    // =====================================================

    const googleTokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: connection.refresh_token,
          grant_type: "refresh_token",
        }),
      }
    );

    const googleTokens = await googleTokenResponse.json();

    if (!googleTokenResponse.ok || !googleTokens.access_token) {
      console.error(
        "Erreur refresh token Google :",
        googleTokens
      );

      return NextResponse.json(
        {
          error: "Impossible de renouveler l'accès Google Agenda",
          needsGoogleConnection: true,
        },
        { status: 401 }
      );
    }

    const googleAccessToken = googleTokens.access_token;

// --------------------------------------------------
// SUPPRESSIONS EN ATTENTE
// --------------------------------------------------

const { data: pendingDeletions, error: pendingDeletionsError } =
  await supabaseAdmin
    .from("google_calendar_pending_deletions")
    .select(
      "id, activity_id, google_calendar_event_id"
    )
    .eq("user_id", user.id);

if (pendingDeletionsError) {
  console.error(
    "Erreur récupération suppressions Google Calendar :",
    pendingDeletionsError.message
  );

  return NextResponse.json(
    {
      error:
        "Impossible de récupérer les suppressions Google Calendar",
    },
    { status: 500 }
  );
}

let deleted = 0;
let deletionErrors = 0;

for (const deletion of pendingDeletions || []) {
  const googleResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      deletion.google_calendar_event_id
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    }
  );

  // 204 = suppression réussie
  // 404 / 410 = événement déjà supprimé côté Google,
  // donc on considère également la suppression comme terminée.
  if (
    googleResponse.ok ||
    googleResponse.status === 404 ||
    googleResponse.status === 410
  ) {
    const { error: deletePendingError } =
      await supabaseAdmin
        .from("google_calendar_pending_deletions")
        .delete()
        .eq("id", deletion.id);

    if (deletePendingError) {
      console.error(
        "Erreur suppression pending deletion :",
        deletePendingError.message
      );

      deletionErrors++;
      continue;
    }

    deleted++;
  } else {
    console.error(
      `Google DELETE ${deletion.google_calendar_event_id}:`,
      googleResponse.status,
      await googleResponse.text()
    );

    deletionErrors++;
  }
}

    // =====================================================
    // 4. Récupérer les données envoyées par le Planning
    // =====================================================

    const body = await request.json();

    const eventId = body.eventId;
    const timeZone = body.timeZone;

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId manquant" },
        { status: 400 }
      );
    }

    if (!timeZone) {
      return NextResponse.json(
        { error: "Fuseau horaire manquant" },
        { status: 400 }
      );
    }

    // =====================================================
    // 5. Vérifier que ce projet appartient à l'utilisateur
    // =====================================================

    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("owner_id", user.id)
        .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Projet introuvable ou accès interdit" },
        { status: 403 }
      );
    }

    // =====================================================
    // 6. Récupérer les jours du projet
    // =====================================================

    const { data: days, error: daysError } =
      await supabaseAdmin
        .from("event_days")
        .select("id, date")
        .eq("event_id", eventId);

    if (daysError) {
      console.error("Erreur event_days :", daysError.message);

      return NextResponse.json(
        { error: "Impossible de récupérer les jours" },
        { status: 500 }
      );
    }

    const dayIds = (days || []).map((day) => day.id);

    if (dayIds.length === 0) {
      return NextResponse.json({
  created,
  updated,
  deleted,
  errors: errors + deletionErrors,
  skipped,
});
    }

    // =====================================================
    // 7. Récupérer les activités du projet
    // =====================================================

    const { data: activities, error: activitiesError } =
      await supabaseAdmin
        .from("activities")
        .select(
          "id, day_id, title, description, start_time, end_time, google_calendar_event_id"
        )
        .in("day_id", dayIds);

    if (activitiesError) {
      console.error(
        "Erreur activities :",
        activitiesError.message
      );

      return NextResponse.json(
        { error: "Impossible de récupérer les activités" },
        { status: 500 }
      );
    }

    const dayMap = new Map(
      (days || []).map((day) => [day.id, day])
    );

    let created = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;

    // =====================================================
    // 8. Synchroniser avec Google Calendar
    // =====================================================

    for (const activity of activities || []) {
      const day = dayMap.get(activity.day_id);

      if (!day?.date || !activity.start_time) {
        skipped++;
        continue;
      }

      const startTime = activity.start_time.slice(0, 5);

      let endTime: string;

      if (activity.end_time) {
        endTime = activity.end_time.slice(0, 5);
      } else {
        const [hours, minutes] = startTime
          .split(":")
          .map(Number);

        const endDate = new Date(
          2000,
          0,
          1,
          hours,
          minutes + 60
        );

        endTime =
          `${String(endDate.getHours()).padStart(2, "0")}:` +
          `${String(endDate.getMinutes()).padStart(2, "0")}`;
      }

      const googleEvent = {
        summary: activity.title,

        description:
          activity.description ||
          "Activité synchronisée depuis MERGE",

        start: {
          dateTime: `${day.date}T${startTime}:00`,
          timeZone,
        },

        end: {
          dateTime: `${day.date}T${endTime}:00`,
          timeZone,
        },
      };

      // ---------------------------------------------------
      // Activité déjà présente dans Google Agenda
      // ---------------------------------------------------

      if (activity.google_calendar_event_id) {
        const googleResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
            activity.google_calendar_event_id
          )}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        if (googleResponse.ok) {
          updated++;
        } else {
          console.error(
            `Google PATCH ${activity.title}:`,
            googleResponse.status,
            await googleResponse.text()
          );

          errors++;
        }

        continue;
      }

      // ---------------------------------------------------
      // Nouvelle activité
      // ---------------------------------------------------

      const googleResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleEvent),
        }
      );

      if (!googleResponse.ok) {
        console.error(
          `Google POST ${activity.title}:`,
          googleResponse.status,
          await googleResponse.text()
        );

        errors++;
        continue;
      }

      const googleData = await googleResponse.json();

      const { error: saveError } = await supabaseAdmin
        .from("activities")
        .update({
          google_calendar_event_id: googleData.id,
        })
        .eq("id", activity.id);

      if (saveError) {
        console.error(
          "Erreur sauvegarde google_calendar_event_id :",
          saveError.message
        );

        errors++;
        continue;
      }

      created++;
    }

    // =====================================================
    // 9. Résultat
    // =====================================================

    return NextResponse.json({
  created,
  updated,
  deleted,
  errors: errors + deletionErrors,
  skipped,
});
  } catch (error) {
    console.error(
      "Erreur serveur Google Calendar sync :",
      error
    );

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}