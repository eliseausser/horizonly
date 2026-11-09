import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState =
    request.nextUrl.searchParams.get("state");

  const storedState =
    request.cookies.get(
      "google_calendar_oauth_state"
    )?.value;

  if (!code || !returnedState || !storedState) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=error",
        request.url
      )
    );
  }

  const separatorIndex = returnedState.indexOf(":");

  if (separatorIndex === -1) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=error",
        request.url
      )
    );
  }

  const userId = returnedState.slice(
    0,
    separatorIndex
  );

  const returnedNonce = returnedState.slice(
    separatorIndex + 1
  );

  // Vérification CSRF
  if (returnedNonce !== storedState) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=error",
        request.url
      )
    );
  }

  const redirectUri =
    `${request.nextUrl.origin}/api/google-calendar/callback`;

  // Échange du code temporaire contre les tokens Google
  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret:
          process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error(
      "Erreur échange token Google :",
      tokens
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=error",
        request.url
      )
    );
  }

  if (!tokens.refresh_token) {
    console.error(
      "Google n'a pas retourné de refresh_token"
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=no_refresh_token",
        request.url
      )
    );
  }

  // Stockage serveur uniquement
  const { error } = await supabaseAdmin
    .from("google_calendar_connections")
    .upsert(
      {
        user_id: userId,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  if (error) {
    console.error(
      "Erreur stockage Google Calendar :",
      error.message
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard?google_calendar=error",
        request.url
      )
    );
  }

  const response = NextResponse.redirect(
    new URL(
      "/dashboard?google_calendar=connected",
      request.url
    )
  );

  response.cookies.delete(
    "google_calendar_oauth_state"
  );

  return response;
}