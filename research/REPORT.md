# DEFY: research report for Sundai Hack 148

Date: 2026-11-08. Facts are cited by id from research/verified.json (verified entries only), with the source link. Numbers from the event page, the X table and SPEC.md are named as such. Vendor numbers are marked as vendor numbers.

## Answer

Build DEFY: a 60-second phone game where a behavioral model predicts your pick, then shows you its guess, dares you to pick something else, and seals a second guess for what you will do instead. Every guess is locked with a hash before you tap, so the model cannot cheat (SPEC.md sections 1 and 3).

Three reasons carry the pick:

1. It uses the sponsor model for what it was built for. BehaviorGPT ranks items from a sequence of actions plus context, and DEFY feeds it exactly that.
2. Its core move is new. Blind next-pick prediction has been done several times. Our search found no toy that shows the prediction first and then predicts your reaction to seeing it (PICK.md).
3. It matches what already spreads. One X post with the same hook reached 30,898 likes and 5,648,425 views (X signals table), and a 2026 study gives the claim a real question to argue about.

DEFY scored 44 of 55 in the blind rubric, ahead of "Called It" at 42 (PICK.md, scored by a skeptic who saw only concept cards). The skeptic's kill reason was that a sealed guess about your defiance may land near chance on a large catalog. The design answers that with four cards per turn and chance printed beside every score (SPEC.md section 1). DEFY has not been played yet, so this report makes no claim about how well it predicts.

## 1. The sponsor model: BehaviorGPT-v4

- What it is. A 12.5B-parameter model trained to predict the next event, on 150 billion user actions, or 3.6 trillion tokens ([S-1](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). The event page lists retail, engagement and payments as the data, and names Rickard Brüel-Gabrielsson, MIT PhD and Unbox AI co-founder, as the guest.
- What the vendor claims. It leads the strongest baseline on 30 of 31 dataset-task pairs with no adaptation ([S-2](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). It ranks a full catalog in one pass, under a millisecond per query, 48 times faster than a prompted LLM ([S-3](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). These are vendor numbers from the vendor's own paper.
- Its framing. A language model captures how people describe the world; a behavioral model captures how they act in it ([S-4](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)). That is the "say versus do" line DEFY can dramatize.
- A sober number. After a viewing session, reasoning post-training raises next-purchase accuracy from 13% to 25% ([S-9](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf), vendor number). Exact next-action prediction is hard even for the sponsor.
- Practical limits for a one-day build. The model returns only items in a catalog it knows ([R2-F4](https://raw.githubusercontent.com/Unbox-AI/behaviorgpt/main/README.md)). The SDK README says items are read from content such as name, category, image and price, so item metadata matters. A key holds two catalogs ([R2-F7](https://raw.githubusercontent.com/Unbox-AI/behaviorgpt/main/docs/catalogs.md)). Keys must stay on servers ([R2-F12](https://portal.unboxai.com/terms/)). The terms bar using the service to harm, deceive, track or discriminate against people ([R2-F13](https://portal.unboxai.com/terms/)) and allow rate limits and key revocation ([R2-F11](https://portal.unboxai.com/terms/)). One more caution: a related quote in [R2-F6](https://raw.githubusercontent.com/Unbox-AI/behaviorgpt/main/docs/catalog-format.md) says an upload fails if no images can be used, so an emoji-only catalog needs a check at the workshop.

## 2. What people already built

| Prior art | What it does | What it leaves open |
|---|---|---|
| Unbox's storefront demo | A baby-shower purchase plus a late-October date produce baby Halloween costumes ([S-7](https://research.unboxai.com/behaviorgpt-v4-one-large-behavioral-model.pdf)) | A recommender, not a game |
| Unbox art wall | 19,000 public-domain artworks with the model as curator ([R2-F15](https://github.com/Unbox-AI/aic-artworks)) | Browsing, no challenge |
| Unbox anomaly app | Flags the step where a session crosses a risk barrier ([R2-F14](https://github.com/Unbox-AI/behaviorgpt-anomaly)) | Fraud framing, no player |
| Rigged Draw (Show HN, Oct 2026) | An AI guesses your picks and compares you with 206 people from a psychology study; 209 points and 116 comments on the mirror page ([R3-F15](https://zeli.app/story/50074909)) | Blind prediction only |
| Aaronson Oracle | You press two keys "randomly" while it guesses the next one, with a live accuracy ([R1-F17](https://people.ischool.berkeley.edu/~nick/aaronson-oracle/)); Aaronson says it reached 70% to 80% ([R4-F4](https://github.com/elsehow/aaronson-oracle), his own claim) | Blind, two keys |
| Rock-paper-scissors predictors | An LSTM in the browser ([R4-F14](http://www.byronknoll.com/lstm.html)); a JavaScript version from 2019 ([R4-F15](https://dev.to/victorqribeiro/can-a-neural-network-predict-your-next-move-on-a-game-of-rock-paper-and-scissors-2kgg)) | Blind, three options |
| Human or Not | More than 15 million conversations ([R4-F1](https://www.ai21.com/blog/human-or-not-results)); 68% guessed right ([R4-F2](https://www.ai21.com/blog/human-or-not-results)) | Guess the bot, not the self |
| Akinator | Guesses what you are thinking of ([R4-F17](https://en.wikipedia.org/wiki/Akinator)) | A thought, not a next act |

The pattern: every toy predicts you blind, and every serious system (Centaur, [R4-F6](https://huggingface.co/marcelbinz/Llama-3.1-Centaur-70B); Simile with $100M in funding, [R4-F10](https://www.simile.com/blog/the-simulation-company)) sits behind a lab or a sales call. A search finding nothing is not proof of absence, so treat "no prior art for the open round" as our best reading, not a fact.

## 3. What writers argue

- Autonomy and manipulation. A March 2025 Substack asks whether AI guides us to better choices or subtly steers us ([R3-F2](https://exploringchatgpt.substack.com/p/the-algorithmic-self)), and leans on the Libet experiments ([R3-F3](https://exploringchatgpt.substack.com/p/the-algorithmic-self)). A January 2026 post argues that choice now starts as a suggestion rather than an initiation ([R3-F4](https://exploringchatgpt.substack.com/p/choice-doesnt-start-with-you)).
- Prediction as control. The Bulletin argues that prediction is valuable because it controls what happens next ([R3-F16](https://thebulletin.org/2025/08/how-ai-and-surveillance-capitalism-are-undermining-democracy)); a November 2025 Substack says institutions now anticipate rather than respond ([R3-F17](https://battle4cog.substack.com/p/algorithmic-governance)).
- The blunt version. One Substack claims the system will know what you will do before you do ([R3-F5](https://aicentral.substack.com/p/ai-and-behavioral-pattern-recognition)).
- The skeptics. A June 2026 Verasight report found AI digital twins within 2.1 and 1.8 points on famous poll questions but off by up to 12.8 points on lower-profile ones ([R3-F6](https://www.verasight.io/reports/can-ai-digital-twins-replace-human-respondents), [R3-F7](https://www.verasight.io/reports/can-ai-digital-twins-replace-human-respondents)). Joon Park argues that models trained on what people say online miss what they do in real life ([R3-F12](https://www.latent.space/p/simile)).

Writers argue this in the abstract. DEFY lets the reader test it in a minute, which is the angle none of them offers.

## 4. What the science says, and where it stops

Supports the premise
- Song et al. found 93% potential predictability in mobility. That is an upper bound from entropy, not an achieved model accuracy ([R1-F13](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=20167789&retmode=text&rettype=abstract)), and it varies little between people ([R1-F14](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=20167789&retmode=text&rettype=abstract)).
- Computer judgments from Likes beat friends' judgments, r=0.56 against 0.49, but they judged personality traits, not next actions ([R1-F15](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=32229555,20522719,25583507,18408715&retmode=text&rettype=abstract)).
- Agents built from interviews of 1,052 Americans matched 83%, 82% and 86% of people's own two-week consistency ([R1-F6](https://arxiv.org/abs/2411.10109), [R1-F7](https://arxiv.org/abs/2411.10109)).
- Centaur predicts held-out participants better than existing cognitive models, on lab tasks only ([R1-F5](https://arxiv.org/abs/2410.20268)).
- A 2026 study of 1,305 people found over 40% treated AI as an authority on their own behavior, and that predictions alone may narrow the futures people consider ([R3-F13](https://arxiv.org/abs/2603.28944), [R3-F14](https://arxiv.org/abs/2603.28944)). This is the study behind DEFY's second round.

Limits to say out loud
- In the Fragile Families Challenge, 160 teams did only slightly better than a simple benchmark at predicting life outcomes ([R1-F11](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=32229555,20522719,25583507,18408715&retmode=text&rettype=abstract), [R1-F12](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=32229555,20522719,25583507,18408715&retmode=text&rettype=abstract)).
- The Soon et al. brain result comes from a simple lab button press ([R1-F16](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=32229555,20522719,25583507,18408715&retmode=text&rettype=abstract)).
- Synthetic-respondent results are mixed and cannot be predicted in advance ([R3-F9](https://10xinsights.substack.com/p/synthetic-respondents-and-digital-e18)).
- Twelve taps over 96 everyday items is a toy. The footer in SPEC.md section 5 says so.

So DEFY shows observed counts beside chance and never quotes a potential-predictability figure as if a model reached it.

## 5. What spreads on X

From the X signals table (read 2026-11-08):

- @Arteryclips, 8,031 followers: a post whose text is the all-caps hook about not letting them predict your next move, 30,898 likes, 6,886 bookmarks, 5,648,425 views.
- @thesupermannx, 22,074 followers: a post about a psychological profile of every user, 4,911 likes, 804,973 views.
- @jademiurax, 214,595 followers: a post suggesting your algorithm may know you better than you do, 4,067 likes, 41,762 views.
- @bryan_johnson, 2,172,233 followers: a compute-problem post, 3,369 likes, 179,749 views.

Two readings. First, the meme about being predicted beat far larger accounts, so the hook matters more than the audience. Second, "the machine knows you" claims draw views from both ends of the audience. The table shows post text, not the attached media, so we copy the hook and the theme, not the format of the video.

## 6. The gap DEFY fills

| Gap | How DEFY fills it |
|---|---|
| Every toy predicts blind | Round 2 shows the prediction, then seals a second guess for your reaction |
| "Trust me" predictions | Hash commitment shown before each tap, with a verify-seals panel (SPEC.md A3) |
| Big claims, no counts | Counts beside chance: 1 in 4 blind, 1 in 3 once you defy (SPEC.md section 1 and PICK.md) |
| Sponsor demos are not games | A 96-item catalog ranked by BehaviorGPT from your picks, with a local fallback if it is slow (SPEC.md sections 2 and 3) |
| Abstract free-will debates | A result card you can post and a challenge link for a friend |

## What this report cannot tell you

- How DEFY performs. Nothing has been played. SPEC.md A2 sets targets (at least 75% called on turns 3 to 6 for a one-vibe player, within 8 points of chance for a random player, at least 60% of defiance called), and they are targets, not results.
- Whether the sponsor's benchmark numbers hold on a 96-item everyday catalog. They are vendor numbers on other data.
- Whether the catalog upload accepts emoji-only items (see section 1).
