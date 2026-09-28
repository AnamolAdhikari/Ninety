export const teamGroups = ["All", "Premier League", "La Liga", "Bundesliga", "Serie A", "Countries"] as const;

export type TeamGroup = Exclude<(typeof teamGroups)[number], "All"> | "Other";
export type CatalogTeam = { name: string; group: TeamGroup };

const leagueTeams: Record<Exclude<TeamGroup, "Countries" | "Other">, string[]> = {
  "Premier League": [
    "AFC Bournemouth", "Arsenal", "Aston Villa", "Brentford", "Brighton & Hove Albion", "Chelsea", "Coventry City", "Crystal Palace", "Everton", "Fulham", "Hull City", "Ipswich Town", "Leeds United", "Liverpool", "Manchester City", "Manchester United", "Newcastle United", "Nottingham Forest", "Sunderland", "Tottenham Hotspur",
  ],
  "La Liga": [
    "Athletic Club", "Atlético Madrid", "CA Osasuna", "Celta Vigo", "Deportivo Alavés", "Elche", "Barcelona", "Getafe", "Levante", "Málaga", "Racing Santander", "Rayo Vallecano", "Deportivo La Coruña", "Espanyol", "Real Betis", "Real Madrid", "Real Sociedad", "Sevilla", "Valencia", "Villarreal",
  ],
  Bundesliga: [
    "Augsburg", "Bayer Leverkusen", "Bayern Munich", "Borussia Dortmund", "Borussia Mönchengladbach", "Eintracht Frankfurt", "Elversberg", "Freiburg", "Hamburg", "Hoffenheim", "Köln", "Mainz", "Paderborn", "RB Leipzig", "Schalke 04", "Union Berlin", "VfB Stuttgart", "Werder Bremen",
  ],
  "Serie A": [
    "Atalanta", "Bologna", "Cagliari", "Como", "Fiorentina", "Frosinone", "Genoa", "Inter", "Juventus", "Lazio", "Lecce", "Milan", "Monza", "Napoli", "Parma", "Roma", "Sassuolo", "Torino", "Udinese", "Venezia",
  ],
};

const countries = [
  "Afghanistan", "Albania", "Algeria", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cameroon", "Canada", "Chile", "China PR", "Colombia", "Costa Rica", "Croatia", "Curaçao", "Cyprus", "Czechia", "Denmark", "Ecuador", "Egypt", "El Salvador", "England", "Estonia", "Finland", "France", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kosovo", "Kuwait", "Latvia", "Lebanon", "Lithuania", "Luxembourg", "Malaysia", "Mali", "Mexico", "Moldova", "Montenegro", "Morocco", "Nepal", "Netherlands", "New Zealand", "Nigeria", "North Macedonia", "Northern Ireland", "Norway", "Oman", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Republic of Ireland", "Romania", "Saudi Arabia", "Scotland", "Senegal", "Serbia", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Thailand", "Tunisia", "Türkiye", "Ukraine", "United Arab Emirates", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Wales",
];

export const teamCatalog: CatalogTeam[] = [
  ...Object.entries(leagueTeams).flatMap(([group, teams]) => teams.map(name => ({ name, group: group as CatalogTeam["group"] }))),
  ...countries.map(name => ({ name, group: "Countries" as const })),
];
