## US Chess Rating Search Enhancer
This Chrome extension adds a "High Rating" column to the US Chess player search page, showing the highest rating (published or current) for each player.

US Chess generates a list of official ratings every third Wednesday of each month and becomes official on the first day of the following month. These official ratings are to be used in US Chess tournaments for pairing purposes unless otherwise specified. Some tournament organizers use variations of the rule by using the higher of a player's current/unofficial and official rating for pairing purposes if announced in advance. This Chrome extension makes it easier for organizers to gather this information.

## What It Does

- Detects the player search table on https://new.uschess.org/civicrm/player-search.
- Adds a clickable "Click to Load" cell in the "High Rating" column.
- Fetches and compares the published rating (from MSA) and current rating (from tournament history) when clicked.
- Displays the higher rating or "N/A" if data is missing.

## How to Use

- Load the extension in Chrome 
- Go to https://new.uschess.org/civicrm/player-search.
- Search for a player (e.g., by Member ID).
- Click "Click to Load" in the "High Rating" column to see the highest rating.
