import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function RateGuidePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground">Voice Over Rate Guide</h2>
        <p className="text-sm text-muted-foreground">
          Reference tables for billing estimates. Source:{" "}
          <a
            href="https://voiceoverresourceguide.com/voice-over-rates/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            voiceoverresourceguide.com/voice-over-rates
          </a>
          .
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Corporate / Educational (Non-Broadcast) - SAG-AFTRA (2022-2025)</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Off-Camera Day Performer (First hour)</TableCell>
                <TableCell>
                  Cat 1: <span className="font-medium">$505</span> | Cat 2: <span className="font-medium">$563</span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Narration (each additional half-hour increment)</TableCell>
                <TableCell>
                  <span className="font-medium">$148.00</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Billing Desk uses a simple estimator that converts your <span className="font-medium">word count</span> to
            billed time using a configurable <span className="font-medium">words-per-minute (WPM)</span> assumption,
            then applies the base first-hour rate plus $148 per additional half-hour.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Audio Commercials (Audio Standard Rates) - 2025 SAG-AFTRA (4/1/25-3/31/26)</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Option / Unit</TableHead>
                <TableHead>Traditional Digital</TableHead>
                <TableHead>Digital Plus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>4-week option</TableCell>
                <TableCell>$469.92</TableCell>
                <TableCell>$501.85</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>8-week option</TableCell>
                <TableCell>$499.99</TableCell>
                <TableCell>$602.22</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>1-year option</TableCell>
                <TableCell>$1,315.76</TableCell>
                <TableCell>$1,605.91</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>13-week wild spot (1st unit)</TableCell>
                <TableCell>$365.00</TableCell>
                <TableCell>Starts at $365.00 (unit pricing varies)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>13-week wild spot (Units 2-25)</TableCell>
                <TableCell>$5.38 / unit</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>13-week wild spot (Units 26-60)</TableCell>
                <TableCell>$4.04 / unit</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>13-week wild spot (Unit 61+)</TableCell>
                <TableCell>$4.04 / unit</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Broadcast TV Commercials - Principals (Off Camera) - SAG-AFTRA</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>4-Week</TableHead>
                <TableHead>13-Week</TableHead>
                <TableHead>52-Week</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Session (Principals Off Camera)</TableCell>
                <TableCell colSpan={3}>$618.30</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Digital Use (Streaming Platforms)</TableCell>
                <TableCell>$975.00</TableCell>
                <TableCell>$2,250.00</TableCell>
                <TableCell>$7,500.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Traditional Digital w/ paid YouTube.com use</TableCell>
                <TableCell>$588.00</TableCell>
                <TableCell>$932.40</TableCell>
                <TableCell>$2,856.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Traditional Digital w/o paid YouTube.com use</TableCell>
                <TableCell>$551.25</TableCell>
                <TableCell>$874.13</TableCell>
                <TableCell>$2,677.50</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Linear Domestic Use (Cable: National Cable)</TableCell>
                <TableCell>$1,125.00</TableCell>
                <TableCell>$3,075.00</TableCell>
                <TableCell>$10,125.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Wild Spot (All Broadcast Markets)</TableCell>
                <TableCell>$630.00</TableCell>
                <TableCell>$1,575.00</TableCell>
                <TableCell>$5,670.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Video Game - Interactive - SAG-AFTRA (Interactive Media Agreement)</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>DAY PERFORMER (up to 3 voices / 4 hour day)</TableCell>
                <TableCell>$1,102.00</TableCell>
                <TableCell>Additional voices at $367.50 each</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>DAY PERFORMER (1 voice / 1 hour)</TableCell>
                <TableCell>$551.00</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>6-10 VOICES / 6 HOUR DAY</TableCell>
                <TableCell>$2,204.75</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Additional Compensation - 1st Session</TableCell>
                <TableCell>$75</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Additional Compensation - 2nd Session</TableCell>
                <TableCell>$125</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Additional Compensation - 3rd Session</TableCell>
                <TableCell>$175</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Total Additional Compensation After 10 Sessions</TableCell>
                <TableCell>$2,100</TableCell>
                <TableCell>Paid to all principal performers no later than release date</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Feature & Television Animation - Legacy AFTRA Series</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Session Fee (Segment 10 minutes or less)</TableCell>
                <TableCell>$1,092</TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Session Fee (Segment 10 minutes or longer)</TableCell>
                <TableCell>$1,204</TableCell>
                <TableCell>
                  Additional voices beyond 3: +$326 per voice (per source notes)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">Audiobook - General Non-Union Rates</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rate Type</TableHead>
                <TableHead>Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Per hour</TableCell>
                <TableCell>$300 - $340</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Per page</TableCell>
                <TableCell>$60 - $80</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Source notes mention SAG-AFTRA has audiobook contracts with minimums ranging from $200-$275 plus contributions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <CardTitle className="text-base">ADR Walla - Session Fee</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agreement</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Recognizable voicing of five lines or more (Session fee)</TableCell>
                <TableCell>$1,204.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">
            Source notes state session fee applies for recognizable voicing of five lines or more and residuals are paid based on each airing.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

