import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Non authentifié" },
      { status: 401 }
    );
  }

  const accessToken = authHeader.replace("Bearer ", "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Vérifie que le token appartient bien à un utilisateur MERGE
  const userResponse = await fetch(
    `${supabaseUrl}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
    }
  );

  if (!userResponse.ok) {
    return NextResponse.json(
      { error: "Session invalide" },
      { status: 401 }
    );
  }

  const user = await userResponse.json();

  const state = crypto.randomBytes(32).toString("hex");

  const redirectUri =
    `${request.nextUrl.origin}/api/google-calendar/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",

    scope:
      "https://www.googleapis.com/auth/calendar.events.owned",

    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",

    // On transmet l'utilisateur + un nonce dans state.
    state: `${user.id}:${state}`,
  });

  const response = NextResponse.json({
    url:
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  });

  // Le nonce est conservé dans un cookie HttpOnly.
  response.cookies.set(
    "google_calendar_oauth_state",
    state,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    }
  );

  return response;
}