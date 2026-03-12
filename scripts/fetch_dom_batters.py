#!/usr/bin/env python3
"""
Fetch Statcast pitch-by-pitch data for Dominican Republic WBC 2026 batters.
Outputs TypeScript data file for the Team Dominica Report app.
"""
import pandas as pd
from pybaseball import statcast_batter
import json
import sys
import os
import time

# Dominican Republic position players (MLB ID, Name, Bat Side)
DOM_BATTERS = [
    (665742, "Juan Soto", "L"),
    (665489, "Vladimir Guerrero Jr.", "R"),
    (665487, "Fernando Tatis Jr.", "R"),
    (677594, "Julio Rodríguez", "R"),
    (592518, "Manny Machado", "R"),
    (606466, "Ketel Marte", "S"),
    (665833, "Oneil Cruz", "L"),
    (672695, "Geraldo Perdomo", "S"),
    (665161, "Jeremy Peña", "R"),
    (669224, "Austin Wells", "L"),
    (682663, "Agustín Ramírez", "R"),
    (467793, "Carlos Santana", "S"),
    (642708, "Amed Rosario", "R"),
    (691406, "Junior Caminero", "R"),
    (679032, "Johan Rojas", "R"),
]

PITCH_NAMES = {
    'FF': 'Four-Seam Fastball', 'SI': 'Sinker', 'FC': 'Cutter',
    'CH': 'Changeup', 'SL': 'Slider', 'CU': 'Curveball',
    'ST': 'Sweeper', 'SV': 'Slurve', 'FS': 'Splitter',
    'KC': 'Knuckle Curve', 'KN': 'Knuckleball', 'CS': 'Slow Curve',
}

CALL_DESC_MAP = {
    'called_strike': 'Called Strike',
    'ball': 'Ball',
    'blocked_ball': 'Ball',
    'swinging_strike': 'Swinging Strike',
    'swinging_strike_blocked': 'Swinging Strike',
    'foul': 'Foul',
    'foul_tip': 'Foul Tip',
    'foul_bunt': 'Foul',
    'hit_into_play': 'In play, out(s)',
    'hit_into_play_score': 'In play, run(s)',
    'hit_into_play_no_out': 'In play, no out',
    'hit_by_pitch': 'Hit By Pitch',
    'pitchout': 'Ball',
    'missed_bunt': 'Swinging Strike',
    'bunt_foul_tip': 'Foul Tip',
    'swinging_pitchout': 'Swinging Strike',
}

EVENT_MAP = {
    'single': 'Single', 'double': 'Double', 'triple': 'Triple',
    'home_run': 'Home Run', 'strikeout': 'Strikeout',
    'strikeout_double_play': 'Strikeout Double Play',
    'walk': 'Walk', 'hit_by_pitch': 'Hit By Pitch',
    'intentional_walk': 'Intent Walk',
    'field_out': 'Flyout', 'groundout': 'Groundout',
    'lineout': 'Lineout', 'pop_out': 'Pop Out',
    'grounded_into_double_play': 'Grounded Into DP',
    'force_out': 'Forceout',
    'fielders_choice': 'Fielders Choice',
    'fielders_choice_out': 'Fielders Choice Out',
    'sac_fly': 'Sac Fly', 'sac_bunt': 'Sac Bunt',
    'double_play': 'Double Play', 'triple_play': 'Triple Play',
    'field_error': 'Field Error', 'catcher_interf': 'Catcher Interf',
}


def safe_float(val, default=0.0):
    try:
        if pd.isna(val):
            return default
        return round(float(val), 4)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        if pd.isna(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default


def fetch_batter_data(player_id, name, bat_side):
    """Fetch Statcast data for a single batter."""
    pitches = []

    # Try 2024 season (confirmed available)
    for year, start, end in [(2024, '2024-03-20', '2024-09-30'), (2025, '2025-03-20', '2025-09-30')]:
        try:
            print(f"  Trying {year} season...", flush=True)
            df = statcast_batter(start, end, player_id)
            if df is not None and len(df) > 0:
                print(f"  Got {len(df)} pitches from {year}", flush=True)
                for _, row in df.iterrows():
                    pitch_type = row.get('pitch_type', '')
                    if pd.isna(pitch_type) or pitch_type == '' or pitch_type == 'nan':
                        continue

                    pX = row.get('plate_x', None)
                    pZ = row.get('plate_z', None)
                    if pd.isna(pX) or pd.isna(pZ):
                        continue

                    desc = str(row.get('description', ''))
                    call_desc = CALL_DESC_MAP.get(desc, desc.replace('_', ' ').title())

                    events = row.get('events', '')
                    if pd.isna(events) or events == '' or events == 'nan':
                        ab_result = ''
                    else:
                        ab_result = EVENT_MAP.get(str(events), str(events).replace('_', ' ').title())

                    # Determine actual bat side for switch hitters
                    actual_bat_side = bat_side
                    if bat_side == 'S':
                        stand = str(row.get('stand', ''))
                        if stand in ('L', 'R'):
                            actual_bat_side = stand

                    # Spray chart fields
                    hc_x_val = row.get('hc_x', None)
                    hc_y_val = row.get('hc_y', None)
                    bb_type_val = row.get('bb_type', None)
                    hit_dist_val = row.get('hit_distance_sc', None)

                    pitch = {
                        'batter': name,
                        'batterId': player_id,
                        'batSide': actual_bat_side,
                        'pitcher': str(row.get('player_name', '')).strip() if not pd.isna(row.get('player_name')) else '',
                        'pitcherHand': str(row.get('p_throws', 'R')),
                        'pitchCode': str(pitch_type),
                        'pitchName': PITCH_NAMES.get(str(pitch_type), str(pitch_type)),
                        'pX': safe_float(pX),
                        'pZ': safe_float(pZ),
                        'szTop': safe_float(row.get('sz_top'), 3.5),
                        'szBot': safe_float(row.get('sz_bot'), 1.5),
                        'speed': safe_float(row.get('release_speed'), 0),
                        'balls': safe_int(row.get('balls')),
                        'strikes': safe_int(row.get('strikes')),
                        'callDesc': call_desc,
                        'callCode': '',
                        'abResult': ab_result,
                        'game': f'{year} MLB',
                        'launchSpeed': safe_float(row.get('launch_speed')) if not pd.isna(row.get('launch_speed', float('nan'))) else None,
                        'launchAngle': safe_float(row.get('launch_angle')) if not pd.isna(row.get('launch_angle', float('nan'))) else None,
                        'hcX': safe_float(hc_x_val) if (hc_x_val is not None and not pd.isna(hc_x_val)) else None,
                        'hcY': safe_float(hc_y_val) if (hc_y_val is not None and not pd.isna(hc_y_val)) else None,
                        'bbType': str(bb_type_val) if (bb_type_val is not None and not pd.isna(bb_type_val)) else None,
                        'hitDistance': safe_float(hit_dist_val) if (hit_dist_val is not None and not pd.isna(hit_dist_val)) else None,
                    }
                    pitches.append(pitch)
                break  # Got data, no need to try next year
        except Exception as e:
            print(f"  {year} failed: {e}", flush=True)
            continue

    return pitches


def generate_typescript(all_pitches, batter_info, output_path):
    """Generate TypeScript data file."""
    lines = []
    lines.append("export interface DomPitch {")
    lines.append("  batter: string;")
    lines.append("  batterId: number;")
    lines.append("  batSide: 'L' | 'R';")
    lines.append("  pitcher: string;")
    lines.append("  pitcherHand: 'L' | 'R';")
    lines.append("  pitchCode: string;")
    lines.append("  pitchName: string;")
    lines.append("  pX: number;")
    lines.append("  pZ: number;")
    lines.append("  szTop: number;")
    lines.append("  szBot: number;")
    lines.append("  speed: number;")
    lines.append("  balls: number;")
    lines.append("  strikes: number;")
    lines.append("  callDesc: string;")
    lines.append("  callCode: string;")
    lines.append("  abResult: string;")
    lines.append("  game: string;")
    lines.append("  launchSpeed: number | null;")
    lines.append("  launchAngle: number | null;")
    lines.append("  hcX: number | null;")
    lines.append("  hcY: number | null;")
    lines.append("  bbType: string | null;")
    lines.append("  hitDistance: number | null;")
    lines.append("}")
    lines.append("")
    lines.append("export interface DomBatter {")
    lines.append("  name: string;")
    lines.append("  id: number;")
    lines.append("  batSide: 'L' | 'R' | 'S';")
    lines.append("  pitchCount: number;")
    lines.append("  position: string;")
    lines.append("}")
    lines.append("")

    # Batter metadata
    lines.append("export const DOM_BATTERS: DomBatter[] = [")
    for info in batter_info:
        lines.append(f'  {{ name: "{info["name"]}", id: {info["id"]}, batSide: "{info["batSide"]}", pitchCount: {info["pitchCount"]}, position: "{info["position"]}" }},')
    lines.append("];")
    lines.append("")

    # Pitch data
    lines.append("export const DOM_PITCHES: DomPitch[] = [")
    for p in all_pitches:
        # Escape quotes in names
        batter = p['batter'].replace('"', '\\"')
        pitcher = p['pitcher'].replace('"', '\\"')
        ls = f'{p["launchSpeed"]}' if p['launchSpeed'] is not None else 'null'
        la = f'{p["launchAngle"]}' if p['launchAngle'] is not None else 'null'
        hx = f'{p["hcX"]}' if p['hcX'] is not None else 'null'
        hy = f'{p["hcY"]}' if p['hcY'] is not None else 'null'
        bt = f'"{p["bbType"]}"' if p['bbType'] is not None else 'null'
        hd = f'{p["hitDistance"]}' if p['hitDistance'] is not None else 'null'
        line = (
            f'  {{ batter: "{batter}", batterId: {p["batterId"]}, batSide: "{p["batSide"]}", '
            f'pitcher: "{pitcher}", pitcherHand: "{p["pitcherHand"]}", '
            f'pitchCode: "{p["pitchCode"]}", pitchName: "{p["pitchName"]}", '
            f'pX: {p["pX"]}, pZ: {p["pZ"]}, szTop: {p["szTop"]}, szBot: {p["szBot"]}, '
            f'speed: {p["speed"]}, balls: {p["balls"]}, strikes: {p["strikes"]}, '
            f'callDesc: "{p["callDesc"]}", callCode: "{p["callCode"]}", '
            f'abResult: "{p["abResult"]}", game: "{p["game"]}", '
            f'launchSpeed: {ls}, launchAngle: {la}, '
            f'hcX: {hx}, hcY: {hy}, bbType: {bt}, hitDistance: {hd} }},'
        )
        lines.append(line)
    lines.append("];")
    lines.append("")

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines))

    print(f"\nGenerated {output_path}")
    print(f"Total pitches: {len(all_pitches)}")
    print(f"Total batters: {len(batter_info)}")


# Position assignments for Dominican batters
POSITIONS = {
    665742: "RF/DH",   # Soto
    665489: "1B/DH",   # Vlad Jr
    665487: "RF/SS",   # Tatis
    677594: "CF",      # J-Rod
    592518: "3B",      # Machado
    606466: "2B/OF",   # Marte
    665833: "SS/CF",   # Cruz
    672695: "SS",      # Perdomo
    665161: "SS",      # Peña
    669224: "C",       # Wells
    682663: "C",       # Ramírez
    467793: "1B/DH",   # Santana
    642708: "SS/OF",   # Rosario
    691406: "3B",      # Caminero
    679032: "CF",      # Rojas
}


def main():
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'src', 'data', 'domBatterData.ts'
    )

    all_pitches = []
    batter_info = []

    for player_id, name, bat_side in DOM_BATTERS:
        print(f"\n{'='*50}", flush=True)
        print(f"Fetching: {name} (ID: {player_id}, Bats: {bat_side})", flush=True)
        pitches = fetch_batter_data(player_id, name, bat_side)
        if pitches:
            all_pitches.extend(pitches)
            batter_info.append({
                'name': name,
                'id': player_id,
                'batSide': bat_side,
                'pitchCount': len(pitches),
                'position': POSITIONS.get(player_id, 'UTIL'),
            })
            print(f"  Total: {len(pitches)} pitches", flush=True)
        else:
            print(f"  No data found!", flush=True)

        # Rate limiting
        time.sleep(2)

    if all_pitches:
        generate_typescript(all_pitches, batter_info, output_path)
    else:
        print("ERROR: No data fetched!")
        sys.exit(1)


if __name__ == '__main__':
    main()
