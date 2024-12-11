# Project Proposal

![Banner](images/app-logo.jpeg)

Introducing "Real Music" 🗣️🔥 - a web-based platform to search for and listen to music. This app is for:
- Music enjoyers who like to have on-the-go access to music from anywhere.

- People with OCD who want to store their favourite music in playlists under certain genres/artists.

## 🧱 Core Functionality

- **Playlist Creation:** Users can store their music in playlists.

- **Music Search:** Users are able to search for songs/artists.
  
- **Music Listening:** Users are able to play and listen to music.
  
- **Profile Creation:** Users are able to create/login to profiles to keep their playlists.
  
- **Liked Songs:** Users are able to like specific songs, which will appear in a pre-made playlist titled "Liked Songs".

- **Light Mode/Dark Mode:** Users are able to easily switch between a light mode display and a dark mode display.

- **Artist Information:** Users are able to search for artists and get info on that specific artist.

## 📋 Requirements

### Playlist Stories
- As a user, I want to create a playlist so that I can sort my music however I want.
- As a user, I want to be able to set the name of my playlist so I know which playlist is which.
- As a user, I want to be able to change the picture of the playlist so that I can make it look nice :)
  
### Song Stories
- As a user, I want to be able to search for a song by the title so that I can add it to a playlist or listen to it.
- As a user, I want to be able to search for an artist by name so that I can see all of their songs.

### Profile Stories
- As a user, I want to be able to register for a profile so that I can save my playlists.
- As a user, I want to be able to login to my profile so that I can retrieve all of my playlists.
- As a user, I want to be able to change my name in case I feel like having a different name.
- As a user, I want to be able to set a profile picture so that my profile can look nice :)

## ᛦ Entity Relationship

```mermaid
erDiagram
    USER ||--o{ PLAYLIST : HAS
    PLAYLIST_SONG }o--|| PLAYLIST : "CONTAINS"
    PLAYLIST_SONG }o--|| SONG: "IS"
    SONG ||--o{ ARTIST_SONG: "IS"
    ARTIST ||--o{ ARTIST_SONG: "HAS"
    USER ||--o{ LIKED_SONG: "HAS"
    SONG ||--o{ LIKED_SONG: "IS"

    USER {
        int user_id PK
        string email
        string password
        date created_at
        string profile_name
        date edited_at
        string user_pfp_link
        int favorite_artist_id FK
        string favorite_artist
    }

    PLAYLIST {
        int playlist_id PK
        string playlist_name
        int song_count
        int user_id FK
    }

    SONG {
        int song_id PK
        serial track_id
        string title
        string artist
        string album
        int lenght_in_seconds
    }

    PLAYLIST_SONG {
        int playlist_id PK, FK
        int song_id PK, FK
    }

    ARTIST {
        int artist_id
        string artist_name
        string artist_pfp_link
    }

    ARTIST_SONG {
        int artist_id PK, FK
        int song_id PK, FK
    }

    LIKED_SONG {
        int user_id PK, FK
        int song_id PK, FK
    }
```

## 📍 API Routes

### Profile Management
| Request | Action | Response | Description |
| ----------- | ----------- | ----------- | ----------- |
| POST <br/> /profile | ProfileController:createProfile | 201 <br/> /profile/:id | Creates a new profile. |
| PUT <br/> /profile:id/name | ProfileController:editProfileName | 201 <br/> /profile/:id | Edits the name of a user's profile. |
| PUT <br/> /profile:id/pfp | ProfileController:editProfilePfp | 201 <br/> /profile:id | Edits the picture of the user's profile. |
| DELETE <br/> /profile/:id | ProfileController:deleteProfile | 201 <br/> / | Deletes a user's profile. |
| GET <br/> /profile:id | ProfileController:getProfile | 200 <br/> ProfileView | Gets the profile of a specific user. |

### Playlist Management
| Request | Action | Response | Description |
| ----------- | ----------- | ----------- | ----------- |
| GET <br/> /playlist:id | PlaylistController:getPlaylist | 200 <br/> PlaylistView | Gets a playlist. |
| POST <br/> /playlist | PlaylistController:createPlaylist | 201 <br/> / | Creates a new playlist. |
| PUT <br/> /playlist/:id/name | PlaylistController:editPlaylistName | 201 <br/> /playlist:id | Edits the name of the current playlist. |
| PUT <br/> /playlist/:id/pfp | PlaylistController:editPlaylistPfp | 201 <br/> /playlist:id | Edits the profile picture of the current playlist. |
| DELETE <br/> /playlist/:id | PlaylistController:deletePlaylist | 200 <br/> HomePageView | Deletes the current playlist. |

### Song Management
| Request | Action | Response | Description |
| ----------- | ----------- | ----------- | ----------- |
| PUT <br/> /song/:id/liked | SongController:addLikedSong | 201 <br/> /search | Adds a song to liked songs playlist. |
| PUT <br/> /song/:id/playlist | SongController:addSongToPlaylist | 201 <br/> /search | Adds a song to the current playlist. |


## Wireframes

### Home View
![image](/images/Wireframe-home.png)
The homepage that every user sees the first time they load up the website. Non logged in users will not be able to click any of the buttons on the homepage until they are logged in (Exceptions: dark mode switch, profile icon).

### User Profile (Not logged in)
![image](/images/Wireframe-registerProfile.png)
This is the view that non logged in users will see once they click the profile icon in the top right of the homepage. It has a register button at the bottom that allows users to register for an account.

### User Profile (Logged in)
![image](/images/Wireframe-profile.png)
This is the view that logged in users will see after registering for an account. It has an option to set/change both a profile picture and a username, it has a display of the user's favorite artist, and it has a logout button at the bottom.

### Library View
![image](/images/Wireframe-library.png)
This view shows all the playlists that the user has created, alongside with the pre-made playlist titled "Liked Songs".

### Search View
![image](/images/Wireframe-search.png)
This is the view that displays all the results for whatever the user has typed into the search bar. It will display mutiple results of songs/artists that match or are similar to the input from the user.

