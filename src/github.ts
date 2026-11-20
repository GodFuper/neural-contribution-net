import { ContributionCalendar, ContributionWeek, ContributionDay } from './types.js';

const GRAPHQL_QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          firstDay
          contributionDays {
            date
            contributionCount
            contributionLevel
            weekday
          }
        }
      }
    }
  }
}
`;

function mapContributionLevel(rawLevel: string | number): number {
  if (typeof rawLevel === 'number') {
    return Math.max(0, Math.min(4, rawLevel));
  }
  switch (rawLevel) {
    case 'FIRST_QUARTILE':
      return 1;
    case 'SECOND_QUARTILE':
      return 2;
    case 'THIRD_QUARTILE':
      return 3;
    case 'FOURTH_QUARTILE':
      return 4;
    case 'NONE':
    default:
      return 0;
  }
}

export async function fetchUserContributions(
  username: string,
  token: string
): Promise<ContributionCalendar> {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'neural-contribution-net-action',
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { login: username },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL API error: HTTP ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as any;

  if (json.errors && json.errors.length > 0) {
    throw new Error(`GraphQL Error: ${json.errors[0].message}`);
  }

  const calendarData = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendarData) {
    throw new Error(`User "${username}" not found or contribution calendar is private.`);
  }

  const weeks: ContributionWeek[] = calendarData.weeks.map((w: any) => ({
    firstDay: w.firstDay,
    contributionDays: w.contributionDays.map((d: any) => ({
      date: d.date,
      contributionCount: d.contributionCount,
      contributionLevel: mapContributionLevel(d.contributionLevel),
      weekday: d.weekday ?? new Date(d.date).getUTCDay(),
    })),
  }));

  return {
    totalContributions: calendarData.totalContributions,
    weeks,
  };
}

/**
 * Generate a realistic developer contribution calendar for testing and demo
 */
export function generateMockCalendar(totalWeeks = 53): ContributionCalendar {
  const weeks: ContributionWeek[] = [];
  let totalContributions = 0;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - totalWeeks * 7);

  // Deterministic random seed
  let seed = 1337;
  const rand = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let w = 0; w < totalWeeks; w++) {
    const days: ContributionDay[] = [];
    const isSprintPeriod = (w >= 10 && w <= 14) || (w >= 28 && w <= 32) || (w >= 45 && w <= 49);
    const isVacation = w === 22 || w === 23;

    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = currentDate.toISOString().split('T')[0];

      let level = 0;
      let count = 0;

      if (!isVacation) {
        const isWeekend = d === 0 || d === 6;
        const commitChance = isSprintPeriod
          ? isWeekend ? 0.6 : 0.92
          : isWeekend ? 0.25 : 0.72;

        if (rand() < commitChance) {
          const intensityRoll = rand();
          if (isSprintPeriod && intensityRoll > 0.6) {
            level = intensityRoll > 0.85 ? 4 : 3;
            count = Math.floor(10 + rand() * 15);
          } else if (intensityRoll > 0.8) {
            level = 3;
            count = Math.floor(6 + rand() * 8);
          } else if (intensityRoll > 0.45) {
            level = 2;
            count = Math.floor(3 + rand() * 5);
          } else {
            level = 1;
            count = Math.floor(1 + rand() * 3);
          }
        }
      }

      totalContributions += count;
      days.push({
        date: dateStr,
        contributionCount: count,
        contributionLevel: level,
        weekday: d,
      });
    }

    weeks.push({
      firstDay: days[0].date,
      contributionDays: days,
    });
  }

  return {
    totalContributions,
    weeks,
  };
}
