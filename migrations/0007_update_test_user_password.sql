-- Update the test user's password with a new bcrypt hash
UPDATE users 
SET password = '$2b$08$I0uvkfOTbmo8LxD/1Rn65eGYJ47bQhWCt0JP.JmvtoozrRsfMZJwe'
WHERE email = 'aqmhussein+60@gmail.com';

-- Verify the update
SELECT id, email, name FROM users WHERE email = 'aqmhussein+60@gmail.com';
