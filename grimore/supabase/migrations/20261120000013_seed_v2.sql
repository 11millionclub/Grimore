-- GriMore — 0013 Seed for v2: clue sets, moods, game schedule

create or replace function private.seed_clues(p_title text, p_clues text[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_book uuid;
begin
  select id into v_book from public.books where is_curated and title = p_title limit 1;
  if v_book is null then return; end if;
  insert into public.clue_sets (book_id, clues, validated_at) values (v_book, p_clues, now())
  on conflict (book_id) do update set clues = excluded.clues, validated_at = excluded.validated_at;
end;
$$;

-- Clues go from vague to specific; the fifth nearly gives it away.
select private.seed_clues('Don Quixote', array['First published in two parts in the early 1600s', 'A Spanish comic novel often called the first modern novel', 'An ageing gentleman reads so many tales of chivalry that he sets out as a knight', 'He charges at windmills, convinced they are giants', 'His loyal squire is Sancho Panza']);
select private.seed_clues('Robinson Crusoe', array['Published in 1719', 'An adventure told as a fictional autobiography', 'A sailor is the only survivor of a shipwreck', 'He spends twenty-eight years on a remote island', 'He names his companion Friday']);
select private.seed_clues('Gulliver''s Travels', array['Published in 1726', 'A satirical travel tale by an Irish clergyman', 'A ship''s surgeon is washed up in a series of strange lands', 'In one of them he is a giant among people six inches tall', 'He visits Lilliput and Brobdingnag']);
select private.seed_clues('Frankenstein', array['Published in 1818', 'A gothic novel often called the first work of science fiction', 'It began as an entry in a ghost-story contest near Lake Geneva', 'A young scientist gives life to a creature and then abandons it', 'Its subtitle is "The Modern Prometheus"']);
select private.seed_clues('The Count of Monte Cristo', array['Serialised in the 1840s', 'A French adventure novel about revenge', 'A young sailor is arrested on the day of his engagement feast', 'He escapes the Château d''If and finds a hidden fortune', 'Its author also wrote The Three Musketeers']);
select private.seed_clues('Jane Eyre', array['Published in 1847 under a male pseudonym', 'A Victorian novel narrated by an orphan girl', 'She becomes a governess at Thornfield Hall', 'A secret is hidden in the attic', 'She falls in love with Mr Rochester']);
select private.seed_clues('Wuthering Heights', array['Published in 1847, its author''s only novel', 'A gothic tale set on the Yorkshire moors', 'A foundling is taken in by the Earnshaw family', 'His love for Catherine turns into a lifelong revenge', 'Its brooding antihero is Heathcliff']);
select private.seed_clues('Moby-Dick', array['Published in 1851', 'An American novel about a long sea voyage', 'Its narrator asks you to call him Ishmael', 'The captain lost his leg to the creature he now hunts', 'Captain Ahab is chasing a white whale']);
select private.seed_clues('Madame Bovary', array['Published in 1857, after a trial for obscenity', 'A French realist novel of provincial life', 'A country doctor''s wife longs for the romance she read about in novels', 'Love affairs and debts slowly ruin her', 'Its heroine is Emma, married to Charles']);
select private.seed_clues('A Tale of Two Cities', array['Serialised in 1859', 'A historical novel moving between London and Paris', 'It is set before and during the French Revolution', 'Madame Defarge knits the names of the condemned', 'It opens: "It was the best of times, it was the worst of times"']);
select private.seed_clues('Great Expectations', array['Serialised in 1860 and 1861', 'A Victorian coming-of-age novel', 'An orphan helps an escaped convict on the marshes', 'A jilted bride stopped every clock in her house', 'Its narrator is called Pip']);
select private.seed_clues('Les Misérables', array['Published in 1862', 'A vast French historical novel', 'A former convict steals silver from a bishop, who forgives him', 'A relentless police inspector pursues him for years', 'Jean Valjean and Inspector Javert']);
select private.seed_clues('Alice''s Adventures in Wonderland', array['Published in 1865', 'A children''s fantasy written by an Oxford mathematician', 'A bored girl follows a hurried white rabbit', 'She attends a mad tea party and plays croquet with flamingos', 'She falls down a rabbit hole into Wonderland']);
select private.seed_clues('Crime and Punishment', array['Published in 1866', 'A Russian psychological novel set in St Petersburg', 'A poor former student believes some people are above morality', 'He kills a pawnbroker with an axe', 'Its protagonist is Raskolnikov']);
select private.seed_clues('Little Women', array['Published in 1868', 'An American novel about family and growing up', 'Four sisters come of age during and after the Civil War', 'The spirited second sister wants to be a writer', 'Meg, Jo, Beth and Amy March']);
select private.seed_clues('War and Peace', array['Completed in 1869', 'A vast Russian novel mixing history and philosophy', 'Aristocratic families live through the Napoleonic Wars', 'It includes the Battle of Borodino and the burning of Moscow', 'Pierre Bezukhov and Natasha Rostova']);
select private.seed_clues('Twenty Thousand Leagues Under the Seas', array['Published in 1870', 'A French science-fiction adventure', 'Three men end up aboard a mysterious vessel thought to be a sea monster', 'Its commander has turned his back on the land for ever', 'Captain Nemo and the Nautilus']);
select private.seed_clues('Anna Karenina', array['Published in full in 1878', 'A Russian novel of marriage and society', 'It opens: "All happy families are alike"', 'A married woman falls for the cavalry officer Count Vronsky', 'The novel is named after its heroine']);
select private.seed_clues('The Brothers Karamazov', array['Published in 1880, its author''s final novel', 'A Russian philosophical novel about faith and doubt', 'Three very different sons and their dissolute father', 'It contains the famous chapter "The Grand Inquisitor"', 'Dmitri, Ivan and Alyosha']);
select private.seed_clues('Treasure Island', array['Published as a book in 1883', 'An adventure story for young readers', 'A boy finds a map in a sea chest at his mother''s inn', 'A one-legged ship''s cook keeps a parrot', 'Long John Silver']);
select private.seed_clues('The Picture of Dorian Gray', array['First published in 1890', 'A gothic novel by an Irish wit', 'A beautiful young man wishes he would never grow old', 'A hidden portrait ages and decays in his place', 'It was painted by Basil Hallward']);
select private.seed_clues('Dracula', array['Published in 1897', 'Gothic horror told through letters, diaries and clippings', 'A young solicitor travels to a castle in Transylvania', 'A Dutch professor leads the hunt', 'Van Helsing against a Count']);
select private.seed_clues('The Hound of the Baskervilles', array['Serialised in 1901 and 1902', 'A detective novel', 'A family curse hangs over an estate on Dartmoor', 'A spectral beast is said to hunt the heirs', 'A case for Sherlock Holmes and Dr Watson']);
select private.seed_clues('The Great Gatsby', array['Published in 1925', 'An American novel of the Jazz Age', 'Narrated by Nick Carraway from West Egg', 'A green light shines at the end of a dock across the bay', 'A mysterious millionaire throws lavish parties hoping Daisy will come']);
select private.seed_clues('The Murder of Roger Ackroyd', array['Published in 1926', 'A classic whodunnit in an English village', 'A wealthy man is killed soon after a widow''s death', 'Its twist about the narrator caused a scandal', 'Solved by Hercule Poirot']);
select private.seed_clues('Brave New World', array['Published in 1932', 'A dystopian novel', 'People are grown in hatcheries and sorted into castes', 'Happiness comes from a drug called soma', 'A "Savage" from a reservation is brought to London']);
select private.seed_clues('The Hobbit', array['Published in 1937', 'A fantasy written for children', 'A comfort-loving homebody joins thirteen dwarves on a quest', 'He wins a riddle game in the dark and a magic ring', 'Bilbo Baggins and the dragon Smaug']);
select private.seed_clues('Of Mice and Men', array['Published in 1937', 'A short American novella', 'Two migrant ranch workers dream of a farm of their own', 'One of them is very strong and does not know it', 'George and Lennie']);
select private.seed_clues('Rebecca', array['Published in 1938', 'A gothic novel of suspense', 'A shy young bride arrives at a great Cornish estate', 'The housekeeper Mrs Danvers worships the first wife', 'It opens: "Last night I dreamt I went to Manderley again"']);
select private.seed_clues('And Then There Were None', array['Published in 1939', 'A mystery that is one of the best-selling novels ever', 'Ten strangers are lured to an island', 'A nursery rhyme predicts how each will die', 'Written by the Queen of Crime']);
select private.seed_clues('The Little Prince', array['Published in 1943', 'A short book for children and adults alike', 'A pilot crashes in the Sahara', 'He meets a boy from a tiny asteroid who loves a rose', '"What is essential is invisible to the eye"']);
select private.seed_clues('Animal Farm', array['Published in 1945', 'A political allegory written as a fable', 'Farm animals overthrow their human owner', '"All animals are equal, but some animals are more equal than others"', 'The pigs Napoleon and Snowball']);
select private.seed_clues('Nineteen Eighty-Four', array['Published in 1949', 'A dystopian novel', 'A man rewrites history at the Ministry of Truth', 'What waits in Room 101 is your worst fear', 'Big Brother is watching you']);
select private.seed_clues('The Catcher in the Rye', array['Published in 1951', 'An American coming-of-age novel', 'A teenager expelled from prep school wanders New York for a few days', 'He wonders where the ducks in Central Park go in winter', 'Holden Caulfield']);
select private.seed_clues('The Old Man and the Sea', array['Published in 1952', 'A short novel that helped its author win the Nobel Prize', 'An ageing Cuban fisherman has gone 84 days without a catch', 'He battles a giant marlin for days far out at sea', 'His name is Santiago']);
select private.seed_clues('Fahrenheit 451', array['Published in 1953', 'A dystopian science-fiction novel', 'Firemen start fires instead of putting them out', 'Rebels memorise books to keep them alive', 'Guy Montag; the title is the temperature at which paper burns']);
select private.seed_clues('Dune', array['Published in 1965', 'Epic science fiction', 'A noble family is given control of a desert planet', 'The spice melange and giant sandworms', 'Paul Atreides on Arrakis']);
select private.seed_clues('One Hundred Years of Solitude', array['Published in 1967', 'Magical realism from Colombia', 'Seven generations of one family', 'The town of Macondo, founded in a swamp', 'The Buendía family']);
select private.seed_clues('Slaughterhouse-Five', array['Published in 1969', 'An anti-war satire with science-fiction elements', 'A soldier becomes "unstuck in time"', 'He survives the firebombing of Dresden. So it goes.', 'Billy Pilgrim and the Tralfamadorians']);
select private.seed_clues('The Hitchhiker''s Guide to the Galaxy', array['Published in 1979, after a radio series', 'Comic science fiction', 'Earth is demolished to make way for a hyperspace bypass', 'The answer to life, the universe and everything is 42', 'Arthur Dent, a towel, and "Don''t Panic"']);
select private.seed_clues('The Handmaid''s Tale', array['Published in 1985', 'A dystopian novel by a Canadian author', 'A theocratic regime has taken over and renamed the country Gilead', 'Some women are assigned to bear children for Commanders', 'Its narrator is called Offred']);
select private.seed_clues('Harry Potter and the Philosopher''s Stone', array['Published in 1997', 'A children''s fantasy', 'An orphan sleeps in a cupboard under the stairs', 'Letters arrive inviting him to a school of witchcraft and wizardry', 'Hogwarts and the boy who lived']);
select private.seed_clues('The Road', array['Published in 2006 and awarded the Pulitzer Prize', 'A post-apocalyptic novel', 'A father and his son walk south through a burned world', 'They are "carrying the fire"', 'They push their belongings in a shopping cart']);
select private.seed_clues('To Kill a Mockingbird', array['Published in 1960', 'A novel of the American South', 'It is narrated by a girl nicknamed Scout', 'Her father defends a Black man falsely accused of a crime', 'Atticus Finch']);
select private.seed_clues('The Alchemist', array['Published in 1988, originally in Portuguese', 'A philosophical fable', 'A shepherd boy dreams of treasure near the Egyptian pyramids', '"When you want something, all the universe conspires in helping you"', 'Santiago meets an alchemist in the desert']);
select private.seed_clues('Never Let Me Go', array['Published in 2005', 'Literary fiction with a speculative secret', 'Friends grow up at an English boarding school called Hailsham', 'They learn what they were created for', 'Narrated by Kathy H.']);

drop function private.seed_clues(text, text[]);

-- Moods, derived from the primary genre (curated books only; readers can refine later).
update public.books b set moods = m.moods
from public.genres g, (values
  ('fantasy', array['adventurous', 'magical', 'cosy']),
  ('science-fiction', array['mind-bending', 'adventurous', 'reflective']),
  ('dystopian', array['dark', 'tense', 'reflective']),
  ('gothic', array['dark', 'atmospheric', 'mysterious']),
  ('mystery', array['tense', 'mysterious', 'clever']),
  ('romance', array['romantic', 'witty', 'emotional']),
  ('adventure', array['adventurous', 'epic', 'fast-paced']),
  ('satire', array['funny', 'clever', 'subversive']),
  ('magical-realism', array['dreamy', 'atmospheric', 'emotional']),
  ('historical-fiction', array['epic', 'emotional', 'immersive']),
  ('childrens', array['whimsical', 'cosy', 'heartwarming']),
  ('literary-fiction', array['reflective', 'emotional', 'character-driven'])
) as m(slug, moods)
where g.id = b.primary_genre_id and g.slug = m.slug and b.is_curated and b.moods = '{}';

-- Two weeks of v2 games, starting today.
select private.schedule_games_v2(public.utc_today(), 14);
