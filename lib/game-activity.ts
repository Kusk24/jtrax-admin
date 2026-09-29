/**
 * The two week numbers the server works out (GET dashboard/activity): games
 * the office opened this week, and students playing consistently.
 */
import { api } from "./api";

export type DashboardActivity = {
  gamesOpened: number;
  consistentPlayers: number;
  /** "Consistently" is at least consistentDays of the last windowDays. */
  consistentDays: number;
  windowDays: number;
};

export const getDashboardActivity = () => api.get<DashboardActivity>("dashboard/activity");
