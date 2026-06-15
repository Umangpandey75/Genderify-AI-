
# --- CELL ---
from tensorflow.keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from tensorflow.keras.optimizers import RMSprop
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Conv2D, MaxPool2D, Flatten
import matplotlib.pyplot as plt
import tensorflow as tf
import numpy as np
import  cv2 as cv
import os


# --- CELL ---
train = ImageDataGenerator(
    rescale= 1/255,
    rotation_range=25,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.3,
    brightness_range=[0.7, 1.3],
    horizontal_flip=True,
    fill_mode='nearest'
)
test = ImageDataGenerator(rescale= 1/255)


# --- CELL ---
'a:/project/menWomenClassification-master/menWomenClassification-master/data'

# --- CELL ---
train_dataset = train.flow_from_directory('a:/project/menWomenClassification-master/menWomenClassification-master/data/train',
                                          target_size=(224, 224),
                                          batch_size = 16,
                                          class_mode='binary')
test_dataset = test.flow_from_directory('a:/project/menWomenClassification-master/menWomenClassification-master/data/test',
                                          target_size=(224, 224),
                                          batch_size = 16,
                                          class_mode='binary')
valid_dataset = test.flow_from_directory('a:/project/menWomenClassification-master/menWomenClassification-master/data/valid',
                                          target_size=(224, 224),
                                          batch_size = 16,
                                          class_mode='binary')

# --- CELL ---
train_dataset.class_indices

# --- CELL ---
train_dataset.classes

# --- CELL ---
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout
from tensorflow.keras.models import Model

base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # Freeze pre-trained weights

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.5)(x)  # Regularization to prevent overfitting
predictions = Dense(1, activation='sigmoid')(x)

model = Model(inputs=base_model.input, outputs=predictions)


# --- CELL ---
model.compile(
    loss='binary_crossentropy',
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    metrics=['accuracy']
)


# --- CELL ---
# Phase 1: Train the classification head only (4 epochs)
print('Starting Phase 1 (classification head warm-up)...')
model.fit(
    train_dataset,
    epochs=4,
    validation_data=test_dataset
)

# Phase 2: Unfreeze the top 60 layers of MobileNetV2 base and fine-tune (8 epochs)
print('Starting Phase 2 (fine-tuning)...')
base_model.trainable = True
fine_tune_at = len(base_model.layers) - 60
for layer in base_model.layers[:fine_tune_at]:
    layer.trainable = False

# Recompile with a very low learning rate (1e-5)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='binary_crossentropy',
    metrics=['accuracy']
)

# Callback to decay learning rate on plateau
lr_callback = tf.keras.callbacks.ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.2,
    patience=2,
    min_lr=1e-6
)

# Train for another 8 epochs
model.fit(
    train_dataset,
    epochs=8,
    validation_data=test_dataset,
    callbacks=[lr_callback]
)


# --- CELL ---
test_loss, test_accuracy = model.evaluate(train_dataset)

# --- CELL ---
print(f"test loss: {test_loss}")
print(f"test accuracy: {test_accuracy}")

# --- CELL ---
model.save('new_maleVSfemaleClassification.h5')
print('Model saved Successfullyll..')

# --- CELL ---
dir_path ='a:/project/menWomenClassification-master/menWomenClassification-master/data/valid'
test_Images_paths =[]
for i in os.listdir(dir_path):
    img_path = f"{dir_path}/{i}"
    for j in os.listdir(img_path):
        img_path1 = f"{img_path}/{j}"
        test_Images_paths.append(img_path1)



# --- CELL ---
import random
ind = random.randint(0,len(test_Images_paths))
ran_Img_path = test_Images_paths[ind]
imagel = cv.imread(ran_Img_path)
img = cv.cvtColor(imagel, cv.COLOR_RGB2BGR)
img = cv.resize(img, (224,224) )
plt.imshow(img)
image = load_img(f'{ran_Img_path}', target_size=(224, 224))  # Adjust the size as per your model
image = img_to_array(image)
image = np.expand_dims(image, axis=0)

y = model.predict(image)

y_pred = y>0.5
if y_pred == 0:
    print("man")

else:
    print("woman")

# --- CELL ---
# cam = cv.VideoCapture(0)
# while True:
#     rat, frame = cam.read()
#     cv.imshow("Camra", frame)
    
#     image = load_img(frame, target_size=(224, 224))  # Adjust the size as per your model
#     image = img_to_array(image)
#     image = image / 255.0
#     image = np.expand_dims(image, axis=0) # Add batch dimension (1, 224, 224, 3)

#     y = model.predict(image)
#     # print(y*100)
#     y_pred = y>0.5
#     if y_pred==0:
#         print(f"Model Perdict 'man' with {y[0][0]*100}%")
#     else:
#         print(f"Model Perdict 'woman' with {y[0][0]*100} %")

#     if cv.waitKey(1) & 0xFF == ord('q'):
#         break
# cam.release()
# cv.destroyAllWindows()
