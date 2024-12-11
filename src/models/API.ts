export default class API {
  static async getAccessToken() {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(
            "SPOTIFY_CLIENT_ID:SPOTIFY_SECRET"
          ), // Base64 encoded client ID and client secret
      },
      body: "grant_type=client_credentials&scope=user-modify-playback-state",
    });

    const data = await response.json();
    return data.access_token;
  }
}
