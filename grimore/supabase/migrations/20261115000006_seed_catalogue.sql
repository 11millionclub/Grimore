-- GriMore — 0006 Curated seed content
--
-- Every fact below (author, nationality, first publication year, primary
-- genre) is a widely documented bibliographic fact. Page counts are rounded
-- approximations of a typical edition and are only ever shown to players as
-- broad bands (under 200, 200–349, 350–499, 500–699, 700+).
-- Covers are attached afterwards from Open Library (see supabase/seed/).

insert into public.genres (slug, name, sort_order) values
  ('literary-fiction', 'Literary Fiction', 1),
  ('romance', 'Romance', 2),
  ('mystery', 'Mystery & Crime', 3),
  ('gothic', 'Gothic & Horror', 4),
  ('science-fiction', 'Science Fiction', 5),
  ('fantasy', 'Fantasy', 6),
  ('dystopian', 'Dystopian', 7),
  ('historical-fiction', 'Historical Fiction', 8),
  ('magical-realism', 'Magical Realism', 9),
  ('adventure', 'Adventure', 10),
  ('satire', 'Satire', 11),
  ('childrens', 'Children''s Classics', 12),
  ('young-adult', 'Young Adult', 13),
  ('thriller', 'Thriller', 14),
  ('poetry', 'Poetry', 15),
  ('philosophy', 'Philosophy', 16),
  ('non-fiction', 'Non-fiction', 17),
  ('memoir', 'Memoir & Biography', 18),
  ('graphic-novels', 'Graphic Novels', 19),
  ('short-stories', 'Short Stories', 20)
on conflict (slug) do nothing;

insert into public.achievements (id, name, description, icon, category, xp_reward, sort_order) values
  ('first_day', 'First Day', 'Complete your first daily challenge.', 'sunrise', 'games', 10, 1),
  ('streak_3', 'Three-Day Streak', 'Play on three consecutive days.', 'zap', 'streak', 15, 2),
  ('streak_7', 'Seven-Day Streak', 'A full week of daily stories.', 'award', 'streak', 30, 3),
  ('streak_30', 'Thirty-Day Streak', 'A month without missing a day.', 'star', 'streak', 100, 4),
  ('perfect_day', 'Perfect Day', 'Complete all three challenges in a single day.', 'sun', 'games', 25, 5),
  ('book_detective', 'Book Detective', 'Solve Bookle in three guesses or fewer.', 'search', 'games', 20, 6),
  ('literary_mind', 'Literary Mind', 'Answer ten Literary Quiz questions correctly.', 'feather', 'games', 30, 7),
  ('cover_expert', 'Cover Expert', 'Name a Cover Reveal without using a hint.', 'eye', 'games', 20, 8)
on conflict (id) do nothing;

create or replace function private.seed_book(
  p_title text, p_author text, p_nationality text, p_year int,
  p_genre text, p_pages int, p_extra_genres text[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_book uuid;
  v_genre smallint;
begin
  select id into v_author from public.authors where lower(name) = lower(p_author);
  if v_author is null then
    insert into public.authors (name, nationality_code) values (p_author, p_nationality)
    returning id into v_author;
  end if;
  select b.id into v_book from public.books b
    join public.book_authors ba on ba.book_id = b.id and ba.author_id = v_author
   where b.title = p_title;
  if v_book is not null then return v_book; end if;

  select id into v_genre from public.genres where slug = p_genre;
  insert into public.books (title, first_published_year, page_count_estimate, primary_genre_id, is_curated)
  values (p_title, p_year, p_pages, v_genre, true)
  returning id into v_book;
  insert into public.book_authors (book_id, author_id, position) values (v_book, v_author, 0);
  insert into public.book_genres (book_id, genre_id)
    select v_book, g.id from public.genres g where g.slug = any (array[p_genre] || p_extra_genres)
    on conflict do nothing;
  return v_book;
end;
$$;
revoke all on function private.seed_book(text, text, text, int, text, int, text[]) from public, anon, authenticated;

select private.seed_book('Pride and Prejudice', 'Jane Austen', 'GB', 1813, 'romance', 380, '{literary-fiction}');
select private.seed_book('Emma', 'Jane Austen', 'GB', 1815, 'romance', 470, '{literary-fiction}');
select private.seed_book('Jane Eyre', 'Charlotte Brontë', 'GB', 1847, 'literary-fiction', 500, '{gothic,romance}');
select private.seed_book('Wuthering Heights', 'Emily Brontë', 'GB', 1847, 'gothic', 400, '{romance}');
select private.seed_book('Frankenstein', 'Mary Shelley', 'GB', 1818, 'gothic', 280, '{science-fiction}');
select private.seed_book('Dracula', 'Bram Stoker', 'IE', 1897, 'gothic', 420, '{}');
select private.seed_book('Moby-Dick', 'Herman Melville', 'US', 1851, 'adventure', 650, '{literary-fiction}');
select private.seed_book('The Great Gatsby', 'F. Scott Fitzgerald', 'US', 1925, 'literary-fiction', 180, '{}');
select private.seed_book('Nineteen Eighty-Four', 'George Orwell', 'GB', 1949, 'dystopian', 330, '{science-fiction}');
select private.seed_book('Animal Farm', 'George Orwell', 'GB', 1945, 'satire', 110, '{dystopian}');
select private.seed_book('Brave New World', 'Aldous Huxley', 'GB', 1932, 'dystopian', 290, '{science-fiction}');
select private.seed_book('To Kill a Mockingbird', 'Harper Lee', 'US', 1960, 'literary-fiction', 320, '{}');
select private.seed_book('The Catcher in the Rye', 'J. D. Salinger', 'US', 1951, 'literary-fiction', 230, '{}');
select private.seed_book('One Hundred Years of Solitude', 'Gabriel García Márquez', 'CO', 1967, 'magical-realism', 420, '{literary-fiction}');
select private.seed_book('Love in the Time of Cholera', 'Gabriel García Márquez', 'CO', 1985, 'romance', 350, '{literary-fiction}');
select private.seed_book('Don Quixote', 'Miguel de Cervantes', 'ES', 1605, 'satire', 1000, '{adventure}');
select private.seed_book('Crime and Punishment', 'Fyodor Dostoevsky', 'RU', 1866, 'literary-fiction', 550, '{philosophy}');
select private.seed_book('The Brothers Karamazov', 'Fyodor Dostoevsky', 'RU', 1880, 'literary-fiction', 800, '{philosophy}');
select private.seed_book('Anna Karenina', 'Leo Tolstoy', 'RU', 1878, 'literary-fiction', 860, '{romance}');
select private.seed_book('War and Peace', 'Leo Tolstoy', 'RU', 1869, 'historical-fiction', 1225, '{literary-fiction}');
select private.seed_book('Madame Bovary', 'Gustave Flaubert', 'FR', 1857, 'literary-fiction', 330, '{}');
select private.seed_book('Les Misérables', 'Victor Hugo', 'FR', 1862, 'historical-fiction', 1400, '{literary-fiction}');
select private.seed_book('The Count of Monte Cristo', 'Alexandre Dumas', 'FR', 1844, 'adventure', 1200, '{historical-fiction}');
select private.seed_book('The Little Prince', 'Antoine de Saint-Exupéry', 'FR', 1943, 'childrens', 100, '{fantasy}');
select private.seed_book('The Stranger', 'Albert Camus', 'FR', 1942, 'literary-fiction', 120, '{philosophy}');
select private.seed_book('The Hobbit', 'J. R. R. Tolkien', 'GB', 1937, 'fantasy', 310, '{childrens}');
select private.seed_book('Harry Potter and the Philosopher''s Stone', 'J. K. Rowling', 'GB', 1997, 'fantasy', 220, '{young-adult}');
select private.seed_book('The Hitchhiker''s Guide to the Galaxy', 'Douglas Adams', 'GB', 1979, 'science-fiction', 200, '{satire}');
select private.seed_book('Dune', 'Frank Herbert', 'US', 1965, 'science-fiction', 600, '{}');
select private.seed_book('Fahrenheit 451', 'Ray Bradbury', 'US', 1953, 'dystopian', 160, '{science-fiction}');
select private.seed_book('The Handmaid''s Tale', 'Margaret Atwood', 'CA', 1985, 'dystopian', 310, '{literary-fiction}');
select private.seed_book('Beloved', 'Toni Morrison', 'US', 1987, 'literary-fiction', 320, '{historical-fiction}');
select private.seed_book('Things Fall Apart', 'Chinua Achebe', 'NG', 1958, 'literary-fiction', 210, '{historical-fiction}');
select private.seed_book('The Alchemist', 'Paulo Coelho', 'BR', 1988, 'literary-fiction', 200, '{philosophy}');
select private.seed_book('Norwegian Wood', 'Haruki Murakami', 'JP', 1987, 'literary-fiction', 300, '{romance}');
select private.seed_book('Kafka on the Shore', 'Haruki Murakami', 'JP', 2002, 'magical-realism', 470, '{literary-fiction}');
select private.seed_book('The Name of the Rose', 'Umberto Eco', 'IT', 1980, 'mystery', 530, '{historical-fiction}');
select private.seed_book('The Murder of Roger Ackroyd', 'Agatha Christie', 'GB', 1926, 'mystery', 300, '{}');
select private.seed_book('And Then There Were None', 'Agatha Christie', 'GB', 1939, 'mystery', 270, '{thriller}');
select private.seed_book('The Hound of the Baskervilles', 'Arthur Conan Doyle', 'GB', 1902, 'mystery', 250, '{gothic}');
select private.seed_book('The Picture of Dorian Gray', 'Oscar Wilde', 'IE', 1890, 'gothic', 250, '{literary-fiction,philosophy}');
select private.seed_book('Great Expectations', 'Charles Dickens', 'GB', 1861, 'literary-fiction', 500, '{}');
select private.seed_book('A Tale of Two Cities', 'Charles Dickens', 'GB', 1859, 'historical-fiction', 450, '{literary-fiction}');
select private.seed_book('The Road', 'Cormac McCarthy', 'US', 2006, 'dystopian', 290, '{literary-fiction}');
select private.seed_book('Never Let Me Go', 'Kazuo Ishiguro', 'GB', 2005, 'literary-fiction', 290, '{science-fiction,dystopian}');
select private.seed_book('The Remains of the Day', 'Kazuo Ishiguro', 'GB', 1989, 'literary-fiction', 250, '{historical-fiction}');
select private.seed_book('Mrs Dalloway', 'Virginia Woolf', 'GB', 1925, 'literary-fiction', 200, '{}');
select private.seed_book('The Grapes of Wrath', 'John Steinbeck', 'US', 1939, 'literary-fiction', 460, '{historical-fiction}');
select private.seed_book('Of Mice and Men', 'John Steinbeck', 'US', 1937, 'literary-fiction', 110, '{}');
select private.seed_book('Blindness', 'José Saramago', 'PT', 1995, 'literary-fiction', 330, '{dystopian}');
select private.seed_book('Dom Casmurro', 'Machado de Assis', 'BR', 1899, 'literary-fiction', 250, '{}');
select private.seed_book('The House of the Spirits', 'Isabel Allende', 'CL', 1982, 'magical-realism', 430, '{historical-fiction}');
select private.seed_book('Pedro Páramo', 'Juan Rulfo', 'MX', 1955, 'magical-realism', 130, '{literary-fiction}');
select private.seed_book('The Old Man and the Sea', 'Ernest Hemingway', 'US', 1952, 'literary-fiction', 130, '{adventure}');
select private.seed_book('Rebecca', 'Daphne du Maurier', 'GB', 1938, 'gothic', 400, '{mystery,romance}');
select private.seed_book('Little Women', 'Louisa May Alcott', 'US', 1868, 'literary-fiction', 500, '{}');
select private.seed_book('Alice''s Adventures in Wonderland', 'Lewis Carroll', 'GB', 1865, 'childrens', 100, '{fantasy}');
select private.seed_book('Gulliver''s Travels', 'Jonathan Swift', 'IE', 1726, 'satire', 300, '{adventure}');
select private.seed_book('Robinson Crusoe', 'Daniel Defoe', 'GB', 1719, 'adventure', 320, '{}');
select private.seed_book('Treasure Island', 'Robert Louis Stevenson', 'GB', 1883, 'adventure', 240, '{childrens}');
select private.seed_book('Middlemarch', 'George Eliot', 'GB', 1871, 'literary-fiction', 880, '{}');
select private.seed_book('Invisible Cities', 'Italo Calvino', 'IT', 1972, 'literary-fiction', 165, '{}');
select private.seed_book('The God of Small Things', 'Arundhati Roy', 'IN', 1997, 'literary-fiction', 340, '{}');
select private.seed_book('Normal People', 'Sally Rooney', 'IE', 2018, 'literary-fiction', 270, '{romance}');
select private.seed_book('The Secret History', 'Donna Tartt', 'US', 1992, 'literary-fiction', 560, '{mystery}');
select private.seed_book('The Left Hand of Darkness', 'Ursula K. Le Guin', 'US', 1969, 'science-fiction', 300, '{}');
select private.seed_book('Slaughterhouse-Five', 'Kurt Vonnegut', 'US', 1969, 'satire', 215, '{science-fiction}');
select private.seed_book('Catch-22', 'Joseph Heller', 'US', 1961, 'satire', 450, '{}');
select private.seed_book('The Bell Jar', 'Sylvia Plath', 'US', 1963, 'literary-fiction', 240, '{}');
select private.seed_book('Twenty Thousand Leagues Under the Seas', 'Jules Verne', 'FR', 1870, 'adventure', 400, '{science-fiction}');
select private.seed_book('Ulysses', 'James Joyce', 'IE', 1922, 'literary-fiction', 730, '{}');

-- ---------------------------------------------------------------------------
-- Literary Quiz bank. Each question was checked against standard references
-- before inclusion; validated_at marks it eligible for scheduling.
-- ---------------------------------------------------------------------------
create or replace function private.seed_quiz(
  p_category text, p_difficulty int, p_prompt text, p_options text[], p_correct int,
  p_explanation text, p_related_title text default null
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.quiz_questions (category, difficulty, prompt, options, correct_index, explanation, related_book_id, validated_at, validation_note)
  values (p_category, p_difficulty, p_prompt, to_jsonb(p_options), p_correct, p_explanation,
    (select id from public.books where title = p_related_title and is_curated limit 1),
    now(), 'Curated seed v1')
  on conflict (prompt) do nothing
$$;
revoke all on function private.seed_quiz(text, int, text, text[], int, text, text) from public, anon, authenticated;

select private.seed_quiz('author', 1, 'Who wrote "One Hundred Years of Solitude"?',
  array['Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Julio Cortázar'], 1,
  'Gabriel García Márquez published the novel in 1967. It follows seven generations of the Buendía family and became a landmark of Latin American literature.',
  'One Hundred Years of Solitude');
select private.seed_quiz('opening_line', 1, 'Which novel opens with the line "Call me Ishmael."?',
  array['Moby-Dick', 'Robinson Crusoe', 'Treasure Island', 'The Old Man and the Sea'], 0,
  'Herman Melville''s Moby-Dick (1851) is narrated by Ishmael, a sailor aboard the whaling ship Pequod.',
  'Moby-Dick');
select private.seed_quiz('origin', 2, 'In which country was Chinua Achebe, author of "Things Fall Apart", born?',
  array['Ghana', 'Kenya', 'Nigeria', 'South Africa'], 2,
  'Chinua Achebe was born in 1930 in Ogidi, in south-eastern Nigeria. Things Fall Apart (1958) is set among the Igbo people.',
  'Things Fall Apart');
select private.seed_quiz('movement', 2, 'Gabriel García Márquez is most closely associated with which literary style?',
  array['Magical realism', 'Naturalism', 'Surrealism', 'Modernism'], 0,
  'Magical realism blends the everyday with the marvellous, presented in a matter-of-fact tone. García Márquez is its best-known exponent.',
  'One Hundred Years of Solitude');
select private.seed_quiz('author', 1, 'Which author wrote both "Emma" and "Persuasion"?',
  array['Charlotte Brontë', 'George Eliot', 'Jane Austen', 'Mary Shelley'], 2,
  'Jane Austen published Emma in 1815. Persuasion appeared posthumously at the end of 1817, alongside Northanger Abbey.',
  'Emma');
select private.seed_quiz('character', 1, 'In which novel does the lawyer Atticus Finch appear?',
  array['The Grapes of Wrath', 'To Kill a Mockingbird', 'The Catcher in the Rye', 'Beloved'], 1,
  'Atticus Finch is the father of the narrator, Scout, in Harper Lee''s To Kill a Mockingbird (1960).',
  'To Kill a Mockingbird');
select private.seed_quiz('character', 1, 'Which writer created the Belgian detective Hercule Poirot?',
  array['Arthur Conan Doyle', 'Dorothy L. Sayers', 'Agatha Christie', 'Georges Simenon'], 2,
  'Agatha Christie introduced Poirot in The Mysterious Affair at Styles (1920). He appears in dozens of her novels and stories.',
  'The Murder of Roger Ackroyd');
select private.seed_quiz('setting', 2, 'What is the name of the fictional town at the heart of "One Hundred Years of Solitude"?',
  array['Comala', 'Macondo', 'Yoknapatawpha', 'Santa Teresa'], 1,
  'Macondo is founded by José Arcadio Buendía. Comala is the ghost town of Juan Rulfo''s Pedro Páramo.',
  'One Hundred Years of Solitude');
select private.seed_quiz('awards', 2, 'Which author of "Blindness" won the Nobel Prize in Literature in 1998?',
  array['José Saramago', 'António Lobo Antunes', 'Fernando Pessoa', 'Gabriel García Márquez'], 0,
  'José Saramago received the 1998 Nobel Prize in Literature, becoming the first Portuguese-language writer to win it.',
  'Blindness');
select private.seed_quiz('character', 1, 'Heathcliff and Catherine Earnshaw are central characters in which novel?',
  array['Jane Eyre', 'Wuthering Heights', 'Rebecca', 'Middlemarch'], 1,
  'Wuthering Heights (1847) was Emily Brontë''s only novel, published under the pseudonym Ellis Bell.',
  'Wuthering Heights');
select private.seed_quiz('author', 1, 'Who wrote "Les Misérables"?',
  array['Alexandre Dumas', 'Gustave Flaubert', 'Émile Zola', 'Victor Hugo'], 3,
  'Victor Hugo published Les Misérables in 1862, while he was living in exile on the island of Guernsey.',
  'Les Misérables');
select private.seed_quiz('character', 1, 'In "Nineteen Eighty-Four", who is the face of the Party''s rule?',
  array['Emmanuel Goldstein', 'O''Brien', 'Big Brother', 'Napoleon'], 2,
  'Big Brother watches from posters throughout Oceania. Goldstein is the Party''s designated enemy; Napoleon is the pig of Animal Farm.',
  'Nineteen Eighty-Four');
select private.seed_quiz('character', 1, 'Which novel is narrated by Nick Carraway?',
  array['The Great Gatsby', 'The Catcher in the Rye', 'Of Mice and Men', 'The Bell Jar'], 0,
  'Nick Carraway tells the story of his mysterious neighbour Jay Gatsby in F. Scott Fitzgerald''s 1925 novel.',
  'The Great Gatsby');
select private.seed_quiz('author', 2, 'Which author wrote "Things Fall Apart" and "Arrow of God"?',
  array['Wole Soyinka', 'Ngũgĩ wa Thiong''o', 'Chinua Achebe', 'Ben Okri'], 2,
  'Chinua Achebe''s Arrow of God (1964) is the third of his novels about colonial-era Igboland, after Things Fall Apart and No Longer at Ease.',
  'Things Fall Apart');
select private.seed_quiz('author', 1, 'Who wrote "The Little Prince"?',
  array['Jules Verne', 'Antoine de Saint-Exupéry', 'Albert Camus', 'Victor Hugo'], 1,
  'Antoine de Saint-Exupéry, an aviator as well as a writer, published The Little Prince in 1943 and illustrated it himself.',
  'The Little Prince');
select private.seed_quiz('author', 1, 'Which Russian author wrote "Crime and Punishment"?',
  array['Leo Tolstoy', 'Anton Chekhov', 'Fyodor Dostoevsky', 'Nikolai Gogol'], 2,
  'Fyodor Dostoevsky published Crime and Punishment in 1866. It follows Raskolnikov, a former student in St Petersburg.',
  'Crime and Punishment');
select private.seed_quiz('setting', 2, 'In which city is James Joyce''s "Ulysses" set?',
  array['London', 'Dublin', 'Paris', 'Trieste'], 1,
  'Ulysses takes place in Dublin on a single day, 16 June 1904, now celebrated as Bloomsday.',
  'Ulysses');
select private.seed_quiz('author', 3, 'Which poet wrote under heteronyms including Alberto Caeiro and Ricardo Reis?',
  array['Luís de Camões', 'Fernando Pessoa', 'Florbela Espanca', 'Sophia de Mello Breyner Andresen'], 1,
  'Fernando Pessoa invented dozens of literary personas. His main heteronyms were Alberto Caeiro, Ricardo Reis and Álvaro de Campos.');
select private.seed_quiz('character', 1, 'Which book features Bilbo Baggins and the dragon Smaug?',
  array['The Hobbit', 'The Chronicles of Narnia', 'The Once and Future King', 'Watership Down'], 0,
  'J. R. R. Tolkien''s The Hobbit (1937) follows Bilbo on a quest to reclaim the dwarves'' treasure from Smaug.',
  'The Hobbit');
select private.seed_quiz('author', 1, 'Who wrote "Frankenstein; or, The Modern Prometheus"?',
  array['Mary Shelley', 'Bram Stoker', 'Ann Radcliffe', 'Percy Bysshe Shelley'], 0,
  'Mary Shelley began the novel during the summer of 1816 near Lake Geneva. It was first published anonymously in 1818.',
  'Frankenstein');
select private.seed_quiz('opening_line', 1, '"It is a truth universally acknowledged..." opens which novel?',
  array['Emma', 'Pride and Prejudice', 'Middlemarch', 'Jane Eyre'], 1,
  'The famous first line of Jane Austen''s Pride and Prejudice (1813) continues: "...that a single man in possession of a good fortune, must be in want of a wife."',
  'Pride and Prejudice');
select private.seed_quiz('author', 1, 'Which Japanese author wrote "Norwegian Wood"?',
  array['Kazuo Ishiguro', 'Yukio Mishima', 'Haruki Murakami', 'Kenzaburō Ōe'], 2,
  'Haruki Murakami published Norwegian Wood in 1987. Its title comes from the Beatles song.',
  'Norwegian Wood');
select private.seed_quiz('setting', 1, 'Which novel is set in the theocratic Republic of Gilead?',
  array['Brave New World', 'The Handmaid''s Tale', 'Fahrenheit 451', 'Never Let Me Go'], 1,
  'Margaret Atwood''s The Handmaid''s Tale (1985) imagines Gilead, a totalitarian state that has replaced the United States.',
  'The Handmaid''s Tale');
select private.seed_quiz('author', 1, 'Who wrote "Don Quixote"?',
  array['Lope de Vega', 'Miguel de Cervantes', 'Federico García Lorca', 'Benito Pérez Galdós'], 1,
  'Miguel de Cervantes published the first part of Don Quixote in 1605 and the second in 1615.',
  'Don Quixote');
select private.seed_quiz('setting', 1, 'At which London address does Sherlock Holmes live?',
  array['10 Downing Street', '221B Baker Street', '12 Grimmauld Place', '7 Eccles Street'], 1,
  'Holmes and Dr Watson share rooms at 221B Baker Street. 7 Eccles Street is Leopold Bloom''s home in Ulysses.',
  'The Hound of the Baskervilles');
select private.seed_quiz('author', 1, 'Which author wrote both "Mrs Dalloway" and "To the Lighthouse"?',
  array['Virginia Woolf', 'Katherine Mansfield', 'E. M. Forster', 'Jean Rhys'], 0,
  'Virginia Woolf published Mrs Dalloway in 1925 and To the Lighthouse in 1927, both key works of modernism.',
  'Mrs Dalloway');
select private.seed_quiz('setting', 2, 'In "Moby-Dick", what is the name of Captain Ahab''s ship?',
  array['The Nautilus', 'The Hispaniola', 'The Pequod', 'The Nostromo'], 2,
  'The Pequod is a Nantucket whaler. The Nautilus belongs to Captain Nemo; the Hispaniola sails in Treasure Island.',
  'Moby-Dick');
select private.seed_quiz('author', 2, 'Which Brazilian author wrote "Dom Casmurro"?',
  array['Jorge Amado', 'Clarice Lispector', 'Machado de Assis', 'Graciliano Ramos'], 2,
  'Machado de Assis published Dom Casmurro in 1899. Readers still debate whether Capitu was unfaithful to the narrator, Bentinho.',
  'Dom Casmurro');
select private.seed_quiz('character', 2, 'Dmitri, Ivan and Alyosha are brothers in which Dostoevsky novel?',
  array['The Idiot', 'Demons', 'Crime and Punishment', 'The Brothers Karamazov'], 3,
  'The Brothers Karamazov (1880) was Dostoevsky''s final novel; he died a few months after its publication.',
  'The Brothers Karamazov');
select private.seed_quiz('author', 1, 'Which author created the land of Narnia?',
  array['J. R. R. Tolkien', 'C. S. Lewis', 'Philip Pullman', 'Lewis Carroll'], 1,
  'C. S. Lewis published seven Chronicles of Narnia between 1950 and 1956, beginning with The Lion, the Witch and the Wardrobe.');
select private.seed_quiz('awards', 2, 'Which novella won Ernest Hemingway the Pulitzer Prize for Fiction in 1953?',
  array['The Old Man and the Sea', 'The Sun Also Rises', 'A Farewell to Arms', 'For Whom the Bell Tolls'], 0,
  'The Old Man and the Sea (1952) tells of the ageing fisherman Santiago. Hemingway received the Nobel Prize in Literature in 1954.',
  'The Old Man and the Sea');
select private.seed_quiz('character', 1, 'Holden Caulfield is the narrator of which novel?',
  array['The Catcher in the Rye', 'The Great Gatsby', 'The Bell Jar', 'Catch-22'], 0,
  'J. D. Salinger''s The Catcher in the Rye (1951) follows Holden over a few days in New York City.',
  'The Catcher in the Rye');
select private.seed_quiz('general', 1, 'Which book''s title refers to the temperature at which the author claimed book paper catches fire?',
  array['Fahrenheit 451', 'Brave New World', 'Nineteen Eighty-Four', 'The Road'], 0,
  'Ray Bradbury''s Fahrenheit 451 (1953) imagines a society in which firemen burn books.',
  'Fahrenheit 451');
select private.seed_quiz('author', 1, 'Who wrote "The Divine Comedy"?',
  array['Petrarch', 'Giovanni Boccaccio', 'Dante Alighieri', 'Virgil'], 2,
  'Dante Alighieri wrote the Divine Comedy in the early 14th century. In it, the poet Virgil guides Dante through Hell and Purgatory.');
select private.seed_quiz('author', 2, 'Which poet wrote "The Waste Land" (1922)?',
  array['W. B. Yeats', 'Ezra Pound', 'T. S. Eliot', 'W. H. Auden'], 2,
  'T. S. Eliot published The Waste Land in 1922; Ezra Pound helped edit the manuscript.');
select private.seed_quiz('author', 2, 'Who wrote the Portuguese epic poem "Os Lusíadas"?',
  array['Luís Vaz de Camões', 'Fernando Pessoa', 'Gil Vicente', 'Almeida Garrett'], 0,
  'Luís Vaz de Camões published Os Lusíadas in 1572. It celebrates Vasco da Gama''s voyage to India.');
select private.seed_quiz('character', 1, 'In "Animal Farm", which animals take control of the farm?',
  array['The horses', 'The dogs', 'The pigs', 'The sheep'], 2,
  'In George Orwell''s 1945 allegory, the pigs, led by Napoleon, gradually become indistinguishable from the humans they overthrew.',
  'Animal Farm');
select private.seed_quiz('setting', 3, 'Which author created the fictional Yoknapatawpha County?',
  array['John Steinbeck', 'William Faulkner', 'Flannery O''Connor', 'Cormac McCarthy'], 1,
  'William Faulkner set many of his novels, including The Sound and the Fury, in Yoknapatawpha County, Mississippi.');
select private.seed_quiz('author', 2, 'Who wrote "In Search of Lost Time" ("À la recherche du temps perdu")?',
  array['Marcel Proust', 'André Gide', 'Gustave Flaubert', 'Honoré de Balzac'], 0,
  'Marcel Proust''s seven-volume novel appeared between 1913 and 1927. Its famous madeleine episode is in the first volume, Swann''s Way.');
select private.seed_quiz('character', 1, 'Captain Nemo commands the submarine Nautilus in which novel?',
  array['Treasure Island', 'Twenty Thousand Leagues Under the Seas', 'Robinson Crusoe', 'Moby-Dick'], 1,
  'Jules Verne''s Twenty Thousand Leagues Under the Seas was published in 1870.',
  'Twenty Thousand Leagues Under the Seas');
select private.seed_quiz('character', 1, 'What is the first name of Miss Bennet, the heroine of "Pride and Prejudice"?',
  array['Jane', 'Elizabeth', 'Lydia', 'Catherine'], 1,
  'Elizabeth Bennet is the second of five sisters. Jane, Lydia and Catherine (Kitty) are her sisters.',
  'Pride and Prejudice');
select private.seed_quiz('author', 1, 'Who wrote "The Name of the Rose"?',
  array['Italo Calvino', 'Umberto Eco', 'Primo Levi', 'Elena Ferrante'], 1,
  'Umberto Eco, a scholar of semiotics, published The Name of the Rose in 1980. It is a murder mystery set in a 14th-century abbey.',
  'The Name of the Rose');
select private.seed_quiz('awards', 2, 'Which author''s "Beloved" won the 1988 Pulitzer Prize for Fiction?',
  array['Alice Walker', 'Toni Morrison', 'Maya Angelou', 'Zora Neale Hurston'], 1,
  'Toni Morrison won the Pulitzer for Beloved (1987) and the Nobel Prize in Literature in 1993.',
  'Beloved');
select private.seed_quiz('character', 1, 'Which novel follows the Joad family on their journey to California?',
  array['Of Mice and Men', 'East of Eden', 'The Grapes of Wrath', 'Little Women'], 2,
  'John Steinbeck''s The Grapes of Wrath (1939) follows Oklahoma farmers fleeing the Dust Bowl. It won the 1940 Pulitzer Prize.',
  'The Grapes of Wrath');
select private.seed_quiz('author', 2, 'Which Chilean author wrote "The House of the Spirits"?',
  array['Isabel Allende', 'Pablo Neruda', 'Roberto Bolaño', 'Gabriela Mistral'], 0,
  'Isabel Allende''s debut novel (1982) follows four generations of the Trueba family.',
  'The House of the Spirits');
